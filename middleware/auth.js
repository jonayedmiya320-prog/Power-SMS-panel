function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'superadmin') {
    return res.status(403).render('error', {
      message: 'এই পেজ অ্যাক্সেস করার অনুমতি আপনার নেই।'
    });
  }
  next();
}

function requirePermission(permissionKey) {
  return function (req, res, next) {
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    if (user.role === 'superadmin') return next();
    if (user.permissions && user.permissions[permissionKey] === true) {
      return next();
    }
    return res.status(403).render('error', {
      message: 'এই ফিচার অ্যাক্সেস করার অনুমতি আপনার নেই।'
    });
  };
}

module.exports = { requireLogin, requireSuperAdmin, requirePermission };