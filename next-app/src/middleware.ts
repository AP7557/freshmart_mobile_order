import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PROTECTED_ADMIN = /^\/admin/;
const PROTECTED_KITCHEN = /^\/kitchen/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;

  if (PROTECTED_ADMIN.test(pathname) || PROTECTED_KITCHEN.test(pathname)) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      const payload = await verifyToken(token);
      if (PROTECTED_ADMIN.test(pathname) && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (PROTECTED_KITCHEN.test(pathname) && payload.role !== "kitchen" && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*"],
};
