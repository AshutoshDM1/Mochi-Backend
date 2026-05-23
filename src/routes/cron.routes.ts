import { Router } from 'express';
import { validateSchema } from '../middleware/validate.middleware';
import { authenticateUser } from '../middleware/auth.middleware';
import createCronController from '../controllers/cron-controllers/create-cron-controller';
import getCronController from '../controllers/cron-controllers/get-cron-controller';
import getCronByIdController from '../controllers/cron-controllers/get-cron-by-id-controller';
import deleteCronController from '../controllers/cron-controllers/delete-cron-controller';
import {
  createCronValidation,
  deleteCronValidationById,
  getCronValidationById,
} from '../controllers/cron-controllers/cron.validation';

const router = Router();

router.get('/', authenticateUser, getCronController);
router.get('/:id', authenticateUser, validateSchema(getCronValidationById), getCronByIdController);
router.post('/', authenticateUser, validateSchema(createCronValidation), createCronController);
router.delete('/:id', authenticateUser, validateSchema(deleteCronValidationById), deleteCronController);

export default router;
