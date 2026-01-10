import express from 'express';
import { getDashboardAnalytics} from '../controllers/analytics/analytics.controller.js';
import { clientPing } from '../controllers/analytics/clientping.controller.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { updateUserActivity } from '../middleware/updateUserActivity.js';

const router = express.Router();

router.get('/', getDashboardAnalytics);
router.post('/ping',isAuthenticated,updateUserActivity,clientPing);

export default router;