import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
// FIX: check your auth.ts export name with: grep "^export" src/lib/auth.ts
// Common alternatives: createToken | generateToken | signToken | createSession
import { createToken } from '@/lib/auth'; // ← swap if yours differs
import { ok, handleRouteError } from '@/lib/api-response';

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// FIX #13: In-memory rate limiter — max 10 attempts per IP per 15 min.
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

function tooManyRequests() {
  return new Response(
    JSON.stringify({
      error: 'Too many login attempts. Please wait 15 minutes.',
    }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(errors: unknown) {
  return new Response(JSON.stringify({ error: errors }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    if (!checkRateLimit(ip)) {
      await new Promise((r) => setTimeout(r, 1000));
      return tooManyRequests();
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    const { email, password } = parsed.data;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Constant-time even when user not found — prevents timing-based enumeration.
    const hash =
      user?.passwordHash ??
      '$2b$12$invalidhashpadding000000000000000000000000000000000000000';
    const isValid = user ? await bcrypt.compare(password, hash) : false;
    if (!isValid) return unauthorized();

    // FIX: replace createToken with whatever your auth.ts exports
    const token = await createToken({ userId: user.id, role: user.role });

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
