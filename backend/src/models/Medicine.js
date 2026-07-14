const crypto = require('crypto');
const {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand
} = require('@aws-sdk/lib-dynamodb');
const { getDocClient } = require('../db/client');
const { medicinesTable } = require('../db/tables');
const { scanAllPages } = require('../db/scanAll');
const { normalizeSupplyOrderKey } = require('../utils/normalizeSupplyOrder');

const ORGANISATION_VALUES = ['R&R', 'Dental Centre', 'Bure Hospital', 'Other'];

const TABLE = () => medicinesTable();

function nowIso() {
  return new Date().toISOString();
}

async function putMedicine(item) {
  await getDocClient().send(new PutCommand({ TableName: TABLE(), Item: item }));
}

async function getById(id) {
  const res = await getDocClient().send(
    new GetCommand({ TableName: TABLE(), Key: { _id: id } })
  );
  return res.Item || null;
}

async function findByTag(tag) {
  const t = String(tag).trim();
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'tag-index',
      KeyConditionExpression: 'tag = :tag',
      ExpressionAttributeValues: { ':tag': t },
      Limit: 1
    })
  );
  return res.Items?.[0] || null;
}

async function scanAllMedicines() {
  return scanAllPages({ TableName: TABLE() });
}

async function getMaxTagCounter() {
  const rows = await scanAllMedicines();
  let max = 0;
  for (const m of rows) {
    const tag = m.tag && String(m.tag);
    if (!tag || !/^2026\d{5}$/.test(tag)) continue;
    const n = parseInt(tag.slice(4), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

async function create(payload) {
  const _id = crypto.randomUUID();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const row = {
    ...payload,
    _id,
    vendorName:
      payload.vendorName != null && String(payload.vendorName).trim() ?
        String(payload.vendorName).trim() :
        '',
    isActive: payload.isActive !== false,
    createdAt,
    updatedAt
  };
  await putMedicine(row);
  return row;
}

async function putItem(row) {
  const next = { ...row, updatedAt: nowIso() };
  await putMedicine(next);
  return next;
}

async function softDelete(id, updatedBy) {
  const existing = await getById(id);
  if (!existing || !existing.isActive) return null;
  const next = { ...existing, isActive: false, updatedBy, updatedAt: nowIso() };
  await putMedicine(next);
  return next;
}

async function reassignUserReferences(fromUserId, toUserId) {
  const ts = nowIso();
  const byCreator = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'createdBy-index',
      KeyConditionExpression: 'createdBy = :createdBy',
      ExpressionAttributeValues: { ':createdBy': fromUserId }
    })
  );
  for (const m of byCreator.Items || []) {
    await putMedicine({ ...m, createdBy: toUserId, updatedAt: ts });
  }

  const all = await scanAllMedicines();
  for (const m of all) {
    if (String(m.updatedBy) !== String(fromUserId)) continue;
    await putMedicine({ ...m, updatedBy: toUserId, updatedAt: ts });
  }
}

async function listActive({ scope, skip, limit }) {
  let rows;
  if (scope.createdBy) {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: 'createdBy-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: { ':createdBy': scope.createdBy }
      })
    );
    rows = (res.Items || []).filter((m) => m.isActive !== false);
  } else {
    rows = (await scanAllMedicines()).filter((m) => m.isActive !== false);
  }
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = rows.length;
  return { rows: rows.slice(skip, skip + limit), total };
}

async function searchActive({ scope, predicate, skip, limit }) {
  const { rows: activeRows } = await listActive({ scope, skip: 0, limit: Number.MAX_SAFE_INTEGER });
  const all = activeRows.filter(predicate);
  all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = all.length;
  return { rows: all.slice(skip, skip + limit), total };
}

async function findBySupplyOrder(supplyOrder) {
  const key = normalizeSupplyOrderKey(supplyOrder);
  if (!key) return null;
  const all = (await scanAllMedicines()).filter((m) => m.isActive !== false);
  return all.find((m) => normalizeSupplyOrderKey(m.supplyOrder) === key) || null;
}

async function findByImageContentHash(hash) {
  const h = String(hash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(h)) return null;
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      IndexName: 'imageContentHash-index',
      KeyConditionExpression: 'imageContentHash = :hash',
      ExpressionAttributeValues: { ':hash': h },
      Limit: 5
    })
  );
  return (res.Items || []).find((m) => m.isActive !== false) || null;
}

async function deleteAll() {
  const rows = await scanAllMedicines();
  for (const m of rows) {
    await getDocClient().send(
      new DeleteCommand({
        TableName: TABLE(),
        Key: { _id: m._id }
      })
    );
  }
}

async function stripAllImages() {
  const rows = await scanAllMedicines();
  const ts = nowIso();
  for (const m of rows) {
    if (!m.imageUrl && !m.imageContentHash) continue;
    const next = { ...m, updatedAt: ts };
    delete next.imageUrl;
    delete next.imageContentHash;
    await putMedicine(next);
  }
}

module.exports = {
  ORGANISATION_VALUES,
  getById,
  findByTag,
  scanAllMedicines,
  getMaxTagCounter,
  create,
  putItem,
  softDelete,
  reassignUserReferences,
  listActive,
  searchActive,
  findBySupplyOrder,
  findByImageContentHash,
  deleteAll,
  stripAllImages
};
