import { Router } from 'express';
import { searchStops } from '../controllers/stops.controller';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { StopSearchQuerySchema } from '../schemas/stops.schema';

const router: Router = Router();

router.get('/', validate(StopSearchQuerySchema, 'query'), asyncHandler(searchStops));

export default router;