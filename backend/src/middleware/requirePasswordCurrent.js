function requirePasswordCurrent(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      message: 'Change your password to continue.',
      code: 'MUST_CHANGE_PASSWORD'
    });
  }
  next();
}

module.exports = requirePasswordCurrent;
