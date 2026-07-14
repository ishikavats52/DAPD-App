const crypto = require('crypto');
const { PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocClient } = require('../db/client');
const { auditLogsTable } = require('../db/tables');
const { scanAllPages } = require('../db/scanAll');

const AUDIT_ACTIONS = [
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'CHANGE_USER_ROLE',
  'APPROVE_USER',
  'ADD_MEDICINE',
  'UPDATE_MEDICINE',
  'DELETE_MEDICINE',
  'SCAN_MEDICINE_IMAGE',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_RESET'
];

const AUDIT_RESOURCES = ['User', 'Medicine'];

const TABLE = () => auditLogsTable();

function nowIso() {
  return new Date().toISOString();
}

async function create(entry) {
  const _id = crypto.randomUUID();
  const createdAt = nowIso();
  const item = {
    _id,
    createdAt,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId ?? null,
    details: entry.details ?? null,
    ip: entry.ip ?? null,
    updatedAt: createdAt
  };
  await getDocClient().send(new PutCommand({ TableName: TABLE(), Item: item }));
  return item;
}

async function scanAll() {
  return scanAllPages({ TableName: TABLE() });
}

async function listFiltered({ match, skip, limit }) {
  const all = (await scanAll()).filter(match);
  all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = all.length;
  return { rows: all.slice(skip, skip + limit), total };
}

async function deleteAll() {
  const rows = await scanAll();
  for (const row of rows) {
    await getDocClient().send(
      new DeleteCommand({ TableName: TABLE(), Key: { _id: row._id } })
    );
  }
}

module.exports = {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  create,
  listFiltered,
  scanAll,
  deleteAll
};
