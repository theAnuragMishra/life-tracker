import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const db = await createClient();
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  if (
    tokenHash &&
    type &&
    [
      "email",
      "signup",
      "magiclink",
      "recovery",
      "invite",
      "email_change",
    ].includes(type)
  ) {
    const { error } = await db.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  } else if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=expired", request.url));
}
