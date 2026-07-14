const User = require('../models/User');
const { normalizePhoneToE164 } = require('../utils/phone');

function isAutoSeedEnabled() {
  const raw = process.env.SEED_AUTO;
  if (raw == null || raw === '') return true;
  return !['0', 'false', 'no', 'off'].includes(String(raw).trim().toLowerCase());
}

function getSeedConfig() {
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PASSWORD?.trim();
  const name = process.env.SEED_NAME?.trim() || 'Super Admin';
  const phone = normalizePhoneToE164(process.env.SEED_PHONE);
  return { email, password, name, phone };
}

async function seedSuperAdminIfEmpty({ requireCredentials = false } = {}) {
  const all = await User.scanAllUsers();
  if (all.length > 0) {
    return { seeded: false, reason: 'users_exist' };
  }

  const { email, password, name, phone } = getSeedConfig();
  if (!email || !password || !phone) {
    const message =
      'No users in DynamoDB. Set SEED_EMAIL, SEED_PASSWORD, and SEED_PHONE in backend/.env to create the first superadmin.';
    if (requireCredentials) {
      throw new Error(message);
    }
    console.warn(`  Superadmin seed  skipped — ${message}`);
    return { seeded: false, reason: 'missing_credentials' };
  }

  await User.create({
    name,
    email,
    password,
    phone,
    role: 'superadmin'
  });

  console.log(`  Superadmin seed  created ${email}`);
  return { seeded: true, email };
}

async function runAutoSeedOnStartup() {
  if (!isAutoSeedEnabled()) {
    return { seeded: false, reason: 'auto_disabled' };
  }
  return seedSuperAdminIfEmpty({ requireCredentials: false });
}

module.exports = {
  getSeedConfig,
  isAutoSeedEnabled,
  runAutoSeedOnStartup,
  seedSuperAdminIfEmpty
};
