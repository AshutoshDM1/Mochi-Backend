import { Request } from 'express';
import { getAuth } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
  auth: ReturnType<typeof getAuth>;
  user: {
    id: string;
  };
  username?: string;
}
