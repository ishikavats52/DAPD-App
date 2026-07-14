function usersTable() {
  return process.env.DYNAMODB_USERS_TABLE?.trim() || 'medicine-api-users';
}

function medicinesTable() {
  return process.env.DYNAMODB_MEDICINES_TABLE?.trim() || 'medicine-api-medicines';
}

function auditLogsTable() {
  return process.env.DYNAMODB_AUDIT_LOGS_TABLE?.trim() || 'medicine-api-audit-logs';
}

module.exports = { usersTable, medicinesTable, auditLogsTable };
