import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, createToken, setAuthCookie } from "@/lib/auth";
import { err } from "@/lib/api-response";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return err("Invalid credentials");

  const user = await loginUser(parsed.data.email, parsed.data.password);
  if (!user) return err("Invalid email or password", 401);

  const token = await createToken({ userId: user.id, role: user.role });
  const cookie = setAuthCookie(token);

  const res = NextResponse.json({ success: true, role: user.role });
  res.cookies.set(cookie);
  return res;
}
