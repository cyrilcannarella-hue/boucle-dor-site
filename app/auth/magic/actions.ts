"use server";

import { cookies } from "next/headers";
import { PREVIEW_SALON_COOKIE } from "@/lib/salon";

export async function setPreviewSalonCookie(slug: string) {
  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_SALON_COOKIE, slug, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}
