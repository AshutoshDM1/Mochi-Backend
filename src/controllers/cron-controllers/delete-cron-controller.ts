import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../lib/prisma';
import APIResponseType from '../../types/response.type';
import { stopCronJob } from '../../services/cron-scheduler.service';

const deleteCronController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;
    const user = req.user;

    const cronBeforeDelete = await prisma.cron.findFirst({
      where: { id, userId: user.id },
      include: { url: true },
    });

    if (!cronBeforeDelete) {
      res.status(404).json({
        success: false,
        message: 'Cron not found or unauthorized',
        data: null,
        statusCode: 404,
      } as APIResponseType);
      return;
    }

    const deletedCron = await prisma.cron.delete({
      where: {
        id: id,
      },
    });

    const stopped = stopCronJob(id);
    if (!stopped) {
      console.warn(
        `[Cron Scheduler] Cron deleted in DB but was not running in-memory (cronId=${id})`
      );
    }

    if (cronBeforeDelete?.url?.url) {
      console.log('\n=== Cron Scheduler ===');
      console.table([
        {
          url: cronBeforeDelete.url.url,
          state: 'DELETED',
        },
      ]);
    }

    res.status(200).json({
      success: true,
      message: 'Cron deleted successfully',
      data: deletedCron,
      statusCode: 200,
    } as APIResponseType);
  }
);
export default deleteCronController;
