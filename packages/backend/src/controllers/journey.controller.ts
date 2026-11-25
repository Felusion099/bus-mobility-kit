import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { JourneyPlanRequest, JourneyPlanResponseSchema } from '../schemas/journey.schema';

export async function planJourney(req: Request, res: Response): Promise<void> {
  try {
    const planRequest: JourneyPlanRequest = req.body;
    const result = await journeyService.planJourney(planRequest);

    // Validate the response body against Zod contract schema before responding
    const validatedResponse = JourneyPlanResponseSchema.parse(result);
    res.status(200).json(validatedResponse);
  } catch (err) {
    console.error('[journey.controller] planJourney error:', err);
    res.status(500).json({ code: 'PLAN_JOURNEY_FAILED', message: String(err) });
  }
}