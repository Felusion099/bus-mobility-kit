import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { StopSearchQuery, StopSearchResponseSchema } from '../schemas/stops.schema';

export async function searchStops(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as StopSearchQuery;
    const result = await journeyService.searchStops(
      query.query,
      query.lat,
      query.lon,
      query.limit
    );

    const validated = StopSearchResponseSchema.parse(result);
    res.status(200).json(validated);
  } catch (err) {
    console.error('[stops.controller] searchStops error:', err);
    res.status(500).json({ code: 'STOP_SEARCH_FAILED', message: String(err) });
  }
}