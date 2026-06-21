function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'superadmin') {
    return res.status(403).render('error', {
      message: 'You do not have permission to access this page.'
    });
  }
  next();
}

function requirePermission(permissionKey) {
  return function (req, res, next) {
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    if (user.role === 'superadmin' || user.role === 'subadmin') return next();
    return res.status(403).render('error', {
      message: 'You do not have permission to access this feature.'
    });
  };
}

module.exports = { requireLogin, requireSuperAdmin, requirePermission };