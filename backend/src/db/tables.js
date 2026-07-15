function usersTable() {
  return process.env.DYNAMODB_USERS_TABLE?.trim() || 'dapd-prod-users';
}

function medicinesTable() {
  return process.env.DYNAMODB_MEDICINES_TABLE?.trim() || 'dapd-prod-medicines';
}

function auditLogsTable() {
  return process.env.DYNAMODB_AUDIT_LOGS_TABLE?.trim() || 'dapd-prod-audit-logs';
}

module.exports = { usersTable, medicinesTable, auditLogsTable };
