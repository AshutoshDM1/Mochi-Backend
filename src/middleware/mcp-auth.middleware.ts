import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware to authenticate MCP requests using a personal API key.
 * Resolves the user and attaches it to req.user for downstream endpoints.
 */
export const authenticateMcpKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawKey = req.headers['x-mochi-api-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. x-mochi-api-key header is missing.',
        statusCode: 401,
      });
      return;
    }

    const hashed = hashApiKey(rawKey);

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { hash: hashed },
      include: { user: true },
    });

    if (!apiKeyRecord) {
      res.status(403).json({
        success: false,
        message: 'Invalid API key.',
        statusCode: 403,
      });
      return;
    }

    // Attach user info to request
    req.user = { id: apiKeyRecord.userId };

    next();
  } catch (error) {
    console.error('MCP authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during MCP authentication',
      statusCode: 500,
    });
  }
};
