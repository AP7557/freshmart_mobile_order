import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleRouteError(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown error";
  if (msg === "UNAUTHORIZED") return err("Unauthorized", 401);
  if (msg === "FORBIDDEN") return err("Forbidden", 403);
  console.error(e);
  return err("Internal server error", 500);
}
