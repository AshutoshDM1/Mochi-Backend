import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../lib/prisma';
import APIResponseType from '../../types/response.type';

const getCronByIdController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = req.user;
    const cronData = await prisma.cron.findFirst({
      where: { id, userId: user.id },
      include: {
        url: {
          include: {
            logs: {
              orderBy: { checkAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });

    if (!cronData) {
      res.status(404).json({
        success: false,
        message: 'Cron not found',
        data: null,
        statusCode: 404,
      } as APIResponseType);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Cron found successfully',
      data: cronData,
      statusCode: 200,
    } as APIResponseType);
  }
);

export default getCronByIdController;
