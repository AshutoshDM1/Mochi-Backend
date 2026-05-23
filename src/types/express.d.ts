import { getAuth } from '@clerk/express';

declare global {
  namespace Express {
    interface Request {
      auth: ReturnType<typeof getAuth>;
      user: {
        id: string;
      };
      username?: string;
    }
  }
}
