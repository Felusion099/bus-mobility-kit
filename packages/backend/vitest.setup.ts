import dotenv from 'dotenv';
import { join } from 'path';
// Load .env from repo root so DATABASE_URL is available to Prisma in tests
dotenv.config({ path: join(process.cwd(), '..', '..', '.env') });
