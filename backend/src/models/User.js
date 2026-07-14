const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
  BatchGetCommand
} = require('@aws-sdk/lib-dynamodb');
const { getDocClient } = require('../db/client');
const { usersTable } = require('../db/tables');
const { scanAllPages } = require('../db/scanAll');
const { normalizeRole } = require('../constants/roles');
const { normalizePhoneToE164 } = require('../utils/phone');

const TABLE = () => usersTable();

function nowIso() {
  return new Date().toISOString();
}

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

function toPublicUser(u) {
  if (!u) return u;
  const { password: _p, superadminAuthVersion: _sav, ...rest } = u;
  const id = typeof rest._id === 'string' ? rest._id : String(rest._id);
  const roleNorm = normalizeRole(rest.role);
  const role = roleNorm || rest.role;
  return {
    ...rest,
    id,
    role,
    mustChangePassword: Boolean(rest.mustChangePassword)
  };
}

async function getById(id) {
  const res = await getDocClient().send(
    new GetCommand({ TableName: TABLE(), Key: { _id: id } })
  );
  return res.Item || null;
}

async function findByEmail(email) {
  const norm = email.toLowerCase().trim();
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': norm },
      Limit: 1
    })
  );
  return res.Items?.[0] || null;
}

async function findByPhone(phone) {
  const norm = normalizePhoneToE164(phone);
  if (!norm) return null;
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'phone-index',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': norm },
      Limit: 1
    })
  );
  return res.Items?.[0] || null;
}

async function emailTaken(email, excludeId) {
  const u = await findByEmail(email);
  if (!u) return false;
  if (excludeId && u._id === excludeId) return false;
  return true;
}

async function phoneTaken(phone, excludeId) {
  const u = await findByPhone(phone);
  if (!u) return false;
  if (excludeId && u._id === excludeId) return false;
  return true;
}

async function scanAllUsers() {
  return scanAllPages({ TableName: TABLE() });
}

async function create(data) {
  const _id = crypto.randomUUID();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const password = await hashPassword(data.password);
  const item = {
    _id,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    password,
    role: data.role || 'employee',
    isActive: data.isActive !== false,
    designation: data.designation ?? null,
    officeName: data.officeName ?? null,
    address: data.address ?? null,
    location: data.location ?? null,
    state: data.state ?? null,
    pincode: data.pincode ?? null,
    isApproved: data.isApproved !== false,
    superadminAuthVersion: 0,
    mustChangePassword: false,
    createdAt,
    updatedAt
  };
  const phoneNorm = normalizePhoneToE164(data.phone);
  if (phoneNorm) item.phone = phoneNorm;
  if (data.createdBy != null && data.createdBy !== '') item.createdBy = data.createdBy;
  if (data.isApproved === false) item.isApproved = false;
  if (data.mustChangePassword === true) item.mustChangePassword = true;

  await getDocClient().send(new PutCommand({ TableName: TABLE(), Item: item }));
  return item;
}

async function putItem(item) {
  const next = { ...item, updatedAt: nowIso() };
  await getDocClient().send(new PutCommand({ TableName: TABLE(), Item: next }));
  return getById(item._id);
}

async function deleteById(id) {
  await getDocClient().send(new DeleteCommand({ TableName: TABLE(), Key: { _id: id } }));
}

async function incrementSuperadminAuthVersion(id) {
  const res = await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { _id: id },
      UpdateExpression: 'ADD superadminAuthVersion :inc SET updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':updatedAt': nowIso()
      },
      ReturnValues: 'ALL_NEW'
    })
  );
  return res.Attributes || null;
}

async function countOtherSuperadmins(excludeUserId) {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'role-index',
      KeyConditionExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'superadmin' }
    })
  );
  return (res.Items || []).filter((u) => u._id !== excludeUserId).length;
}

async function findByRole(role) {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'role-index',
      KeyConditionExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role }
    })
  );
  return res.Items || [];
}

async function listUsersFiltered({ match, skip, limit }) {
  const all = (await scanAllUsers()).filter(match);
  all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = all.length;
  const slice = all.slice(skip, skip + limit);
  const withoutPw = slice.map((u) => {
    const { password: _p, ...rest } = u;
    return rest;
  });
  return { rows: withoutPw, total };
}

async function findIdsByCreatedBy(adminId) {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'createdBy-index',
      KeyConditionExpression: 'createdBy = :createdBy',
      ExpressionAttributeValues: { ':createdBy': adminId },
      ProjectionExpression: '#id',
      ExpressionAttributeNames: { '#id': '_id' }
    })
  );
  return (res.Items || []).map((r) => r._id);
}

function isBatchGetAccessDenied(err) {
  return (
    err?.name === 'AccessDeniedException' ||
    err?.Code === 'AccessDeniedException' ||
    err?.name === 'AccessDenied'
  );
}

async function batchGetByIds(ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (uniq.length === 0) return [];

  const out = [];
  try {
    for (let i = 0; i < uniq.length; i += 100) {
      const chunk = uniq.slice(i, i + 100);
      const res = await getDocClient().send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE()]: { Keys: chunk.map((_id) => ({ _id })) }
          }
        })
      );
      out.push(...(res.Responses?.[TABLE()] || []));
    }
    return out;
  } catch (err) {
    if (!isBatchGetAccessDenied(err)) throw err;
    const rows = await Promise.all(uniq.map((id) => getById(id)));
    return rows.filter(Boolean);
  }
}

async function comparePassword(user, candidate) {
  return bcrypt.compare(String(candidate), user.password);
}

async function updatePasswordPlain(userId, plain) {
  const u = await getById(userId);
  if (!u) return null;
  u.password = await hashPassword(plain);
  delete u.mustChangePassword;
  return putItem(u);
}

module.exports = {
  toPublicUser,
  getById,
  findByEmail,
  findByPhone,
  emailTaken,
  phoneTaken,
  create,
  putItem,
  deleteById,
  incrementSuperadminAuthVersion,
  countOtherSuperadmins,
  findByRole,
  listUsersFiltered,
  findIdsByCreatedBy,
  batchGetByIds,
  comparePassword,
  updatePasswordPlain,
  scanAllUsers
};
