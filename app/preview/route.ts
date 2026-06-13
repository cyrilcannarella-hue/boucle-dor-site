import { NextResponse } from "next/server";
import { PREVIEW_SALON_COOKIE } from "@/lib/salon";

const PREVIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const slug = searchParams.get("salon");

  const response = NextResponse.redirect(new URL("/", origin));

  if (slug) {
    response.cookies.set(PREVIEW_SALON_COOKIE, slug, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: PREVIEW_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
