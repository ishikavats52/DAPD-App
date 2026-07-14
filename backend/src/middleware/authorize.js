const { normalizeRole } = require('../constants/roles');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const effective = normalizeRole(req.user.role) || req.user.role;
    if (!allowedRoles.includes(effective)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not allowed to access this resource`
      });
    }

    next();
  };
}

module.exports = authorize;
