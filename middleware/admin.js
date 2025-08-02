const ErrorResponse = require('../utils/errorResponse');

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('You must be an admin to access this route', 403)
    );
  }
  next();
};