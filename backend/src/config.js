const { createClients, closeClients, ensureTables, verifyTables } = require('./db/client');

function assertRequiredEnv() {
  const missing = [];
  if (!process.env.AWS_REGION?.trim()) missing.push('AWS_REGION');
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');
  if (!process.env.GEMINI_API_KEY?.trim()) missing.push('GEMINI_API_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

async function connectDB() {
  createClients();
  await ensureTables();
  await verifyTables();
  console.log('  DynamoDB      OK');
}

async function disconnectDB() {
  closeClients();
}

module.exports = { assertRequiredEnv, connectDB, disconnectDB };
