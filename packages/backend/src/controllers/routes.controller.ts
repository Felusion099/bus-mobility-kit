import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { RouteMetricsResponseSchema } from '../schemas/journey.schema';

export async function getRouteMetrics(req: Request, res: Response): Promise<void> {
  try {
    const { routeId } = req.params;
    const metrics = await journeyService.getRouteMetrics(routeId);

    if (!metrics) {
      res.status(404).json({
        code: 'ROUTE_NOT_FOUND',
        message: `Transit route with ID or number '${routeId}' not found.`
      });
      return;
    }

    const validated = RouteMetricsResponseSchema.parse(metrics);
    res.status(200).json(validated);
  } catch (err) {
    console.error('[routes.controller] getRouteMetrics error:', err);
    res.status(500).json({ code: 'ROUTE_METRICS_FAILED', message: String(err) });
  }
}