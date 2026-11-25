import { Router } from 'express';
import { getRouteMetrics } from '../controllers/routes.controller';
import { asyncHandler } from '../middleware/async-handler.middleware';

const router: Router = Router();

router.get('/:routeId/metrics', asyncHandler(getRouteMetrics));

export default router;