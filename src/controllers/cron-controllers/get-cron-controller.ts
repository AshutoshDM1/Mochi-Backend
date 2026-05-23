import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../lib/prisma';
import APIResponseType from '../../types/response.type';

const getCronController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const cronData = await prisma.cron.findMany({
      where: {
        userId: user.id,
      },
      include: {
        url: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Cron found successfully',
      data: cronData,
      statusCode: 200,
    } as APIResponseType);
  }
);
export default getCronController;
