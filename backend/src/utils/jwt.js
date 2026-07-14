const jwt = require('jsonwebtoken');

function assertJwtConfigured() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
}

function signUserToken(user) {
  assertJwtConfigured();
  const payload = {
    id: user._id || user.id,
    role: user.role
  };
  if (user.role === 'superadmin') {
    payload.sav = user.superadminAuthVersion || 0;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { assertJwtConfigured, signUserToken };
