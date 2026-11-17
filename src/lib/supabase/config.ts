export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (Boolean(url) !== Boolean(key))
    throw new Error(
      "Set both Supabase environment variables, or leave both empty for demo mode.",
    );
  return url && key ? { url, key } : null;
}
