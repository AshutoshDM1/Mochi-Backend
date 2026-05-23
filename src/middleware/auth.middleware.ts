import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

/**
 * Middleware to authenticate user by Clerk session token.
 * Expects Bearer token in the 'Authorization' header (handled by @clerk/express clerkMiddleware).
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;

    // Check if Clerk session is valid
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Clerk token.',
        statusCode: 401,
      });
      return;
    }

    // Attach user information to request object
    req.auth = auth;
    req.user = { id: userId };
    req.username = undefined;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      statusCode: 500,
    });
  }
};

/**
 * Optional authentication - doesn't fail if no valid Clerk session provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;

    if (userId) {
      req.auth = auth;
      req.user = { id: userId };
      req.username = undefined;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without auth
    next();
  }
};
