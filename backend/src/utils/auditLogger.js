const AuditLog = require('../models/AuditLog');

async function logAudit({ userId, action, resource, resourceId, details, req }) {
  try {
    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress;
    await AuditLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ip
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

module.exports = { logAudit };
