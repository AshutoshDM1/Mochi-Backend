import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { authenticateMcpKey } from '../middleware/mcp-auth.middleware';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import APIResponseType from '../types/response.type';

const router = Router();

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Endpoint to generate a new personal API Key.
 * Clerk authentication is required (used by the React frontend).
 */
router.post('/keys', authenticateUser as any, async (req: any, res: Response) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        message: 'name field is required and must be a string.',
        statusCode: 400,
      });
      return;
    }

    const rawKey = `mochi_pat_${crypto.randomBytes(24).toString('hex')}`;
    const hashed = hashApiKey(rawKey);

    await prisma.apiKey.create({
      data: {
        hash: hashed,
        name: name,
        userId: user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'API Key generated successfully. Save it now, it will not be shown again!',
      data: {
        apiKey: rawKey,
        name: name,
      },
      statusCode: 201,
    } as APIResponseType);
  } catch (error) {
    console.error('Error generating API Key:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating API Key',
      statusCode: 500,
    });
  }
});

/**
 * Endpoint to get the user's active monitors.
 * MCP API Key authentication is required (used by the local CLI client).
 */
router.get('/monitors', authenticateMcpKey as any, async (req: any, res: Response) => {
  try {
    const user = req.user;

    const cronJobs = await prisma.cron.findMany({
      where: { userId: user.id },
      include: { url: true },
    });

    const monitors = cronJobs.map((job) => ({
      id: job.id,
      url: job.url?.url ?? 'N/A',
      interval: job.interval,
      status: job.url?.status ?? 'PENDING',
      totalChecks: job.url?.totalChecks ?? 0,
      averageResponseTimeMs: job.url?.averageResponseTime ?? 0,
      totalUpTimeSeconds: job.url?.totalUpTime ?? 0,
      totalDownTimeSeconds: job.url?.totalDownTime ?? 0,
      lastCheckedAt: job.url?.lastCheckedAt ?? null,
    }));

    res.status(200).json({
      success: true,
      message: 'Monitors fetched successfully.',
      data: monitors,
      statusCode: 200,
    } as APIResponseType);
  } catch (error) {
    console.error('Error fetching MCP monitors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching monitors',
      statusCode: 500,
    });
  }
});

export default router;
