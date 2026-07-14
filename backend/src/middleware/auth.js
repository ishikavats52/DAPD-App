const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');

function tokenSuperadminAuthVersion(decoded) {
  if (decoded == null || decoded.sav === undefined || decoded.sav === null) {
    return 0;
  }
  const n = Number(decoded.sav);
  return Number.isFinite(n) ? n : 0;
}

async function auth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET is not configured' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser = await User.getById(decoded.id);

    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ message: 'User no longer active' });
    }

    if (dbUser.role === ROLES.SUPERADMIN) {
      const dbVersion = Number(dbUser.superadminAuthVersion);
      const expected = Number.isFinite(dbVersion) ? dbVersion : 0;
      const fromToken = tokenSuperadminAuthVersion(decoded);
      if (fromToken !== expected) {
        return res.status(401).json({
          message: 'This account was signed in on another device. Please sign in again.',
          code: 'SESSION_SUPERSEDED'
        });
      }
    }

    req.user = User.toPublicUser(dbUser);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return next(err);
  }
}

module.exports = auth;
