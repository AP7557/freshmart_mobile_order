import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { fail, handleRouteError } from '@/lib/api-response';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// FIX #13: In-memory rate limiter — max 10 attempts per IP per 15 min.
// Replace with Upstash Redis for multi-instance/edge deployments.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      await new Promise((r) => setTimeout(r, 1000)); // slow down brute-force
      return fail('Too many login attempts. Please wait 15 minutes.', 429);
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.flatten().fieldErrors, 400);

    const { email, password } = parsed.data;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Constant-time even when user not found — prevents timing-based user enumeration
    const hash =
      user?.passwordHash ??
      '$2b$12$invalidhashpadding000000000000000000000000000000000000000';
    const isValid = user ? await bcrypt.compare(password, hash) : false;
    if (!isValid) return fail('Invalid email or password', 401);

    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({ role: user.role });
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return res;
  } catch (e) {
    return handleRouteError(e);
  }
}
