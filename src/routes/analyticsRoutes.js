import express from 'express';
import { getDashboardAnalytics } from '../controllers/analytics/analytics.controller.js';


const router = express.Router();
router.get('/', getDashboardAnalytics);

export default router;