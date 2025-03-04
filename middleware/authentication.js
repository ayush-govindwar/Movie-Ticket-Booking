const CustomError = require('../errors');
const { isTokenValid } = require('../utils');
const Token = require('../models/Token');
const { attachCookiesToResponse } = require('../utils');
const authenticateUser = async (req, res, next) => {
  const { refreshToken, accessToken } = req.signedCookies;

  try {
    if (accessToken) {
      const payload = isTokenValid(accessToken);
      req.user = payload.user;
      return next();
    }
    const payload = isTokenValid(refreshToken);

    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    });

    if (!existingToken || !existingToken?.isValid) {//If the refresh token was only validated using jwt.verify(), a logged-out user could still use an old refresh token until it expires.
      throw new CustomError.UnauthenticatedError('Authentication Invalid');
    }

    attachCookiesToResponse({
      res,
      user: payload.user,
      refreshToken: existingToken.refreshToken,
    });

    req.user = payload.user;
    next();
  } catch (error) {
    throw new CustomError.UnauthenticatedError('Authentication Invalid');
  }
};

const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) { //if true then not allowed
      throw new CustomError.UnauthorizedError(
        'Unauthorized to access this route'
      );
    }
    next();
  };
};
const authMiddleware = (req, res, next) => {
  // Get the access token from the signed cookies
  const accessToken = req.signedCookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ message: 'No access token provided. Access denied.' });
  }

  try {
    // Verify the access token and decode it
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = decoded.user; // Attach the user data to the request object
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid access token. Access denied.' });
  }
};

module.exports = {
  authenticateUser,
  authorizePermissions,
  authMiddleware

};
