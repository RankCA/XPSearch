function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    if (req.session.userRole !== role) {
      return res.status(403).render('error', { message: 'Access denied', user: req.session });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
