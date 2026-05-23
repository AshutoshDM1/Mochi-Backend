import { Router } from 'express';
import cronRoutes from './cron.routes';
import mcpRoutes from './mcp.routes';
import { getHealthController } from '../controllers/health-controllers/get-health-controller';

const router = Router();

router.use('/cron', cronRoutes);
router.use('/mcp', mcpRoutes);
router.get('/health', getHealthController);

export default router;
