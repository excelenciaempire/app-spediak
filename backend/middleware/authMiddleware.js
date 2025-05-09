const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// Middleware to check if the authenticated user is an admin
const isAdmin = (req, res, next) => {
  // Clerk authentication middleware should have run before this,
  // populating req.auth
  if (!req.auth || !req.auth.sessionClaims) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  // Check the new claim name from the JWT template
  const userRole = req.auth.sessionClaims?.user_role;

  if (userRole !== 'admin') {
    console.warn(`[isAdmin Middleware] Access denied for user ${req.auth.userId}. Role found in token: ${userRole}`);
    return res.status(403).json({ message: 'Forbidden: Admin privileges required.' });
  }

  // User is authenticated and is an admin
  console.log(`[isAdmin Middleware] Access granted for admin user ${req.auth.userId} with role: ${userRole}`);
  next();
};

// Export Clerk auth and the custom admin check
module.exports = {
    requireAuth: ClerkExpressRequireAuth(), // Standard Clerk auth middleware
    isAdmin, // Custom admin role check middleware
}; 