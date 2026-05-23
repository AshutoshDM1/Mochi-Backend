import type { Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../lib/prisma';

type ClerkEmailAddress = { id: string; email_address: string };

type ClerkUserData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
};

type ClerkWebhookEvent =
  | { type: 'user.created'; data: ClerkUserData }
  | { type: 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id: string; deleted?: boolean } }
  | { type: string; data: unknown };

function primaryEmail(data: ClerkUserData): string | null {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return (
    primary?.email_address ?? data.email_addresses[0]?.email_address ?? null
  );
}

function getClerkUsername(data: ClerkUserData): string {
  if (data.username) return data.username;
  const email = primaryEmail(data);
  if (email) return email.split('@')[0];
  return `user_${data.id.substring(5, 15)}`;
}

export async function clerkWebhookHandler(req: Request, res: Response) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const svixId = req.header('svix-id');
  const svixTimestamp = req.header('svix-timestamp');
  const svixSignature = req.header('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  // Ensure body is raw
  let payload = '';
  if (Buffer.isBuffer(req.body)) {
    payload = req.body.toString('utf8');
  } else if (typeof req.body === 'string') {
    payload = req.body;
  } else {
    console.error('Webhook payload is not raw buffer or string');
    return res.status(400).json({ error: 'Invalid body type, raw body expected' });
  }

  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('Invalid Clerk webhook signature', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const data = evt.data as ClerkUserData;
        const email = primaryEmail(data)?.toLowerCase().trim();
        if (!email) {
          return res.status(400).json({ error: 'No email on Clerk user' });
        }
        const username = getClerkUsername(data);
        await prisma.user.upsert({
          where: { id: data.id },
          update: { email, username },
          create: {
            id: data.id,
            email,
            username,
          },
        });
        break;
      }
      case 'user.updated': {
        const data = evt.data as ClerkUserData;
        const email = primaryEmail(data)?.toLowerCase().trim();
        const username = getClerkUsername(data);
        await prisma.user.update({
          where: { id: data.id },
          data: {
            ...(email ? { email } : {}),
            username,
          },
        });
        break;
      }
      case 'user.deleted': {
        const data = evt.data as { id: string };
        await prisma.user.delete({ where: { id: data.id } }).catch(() => {
          /* already gone */
        });
        break;
      }
      default:
        break;
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to process Clerk webhook:', err);
    return res.status(500).json({ error: 'Processing failed' });
  }
}
