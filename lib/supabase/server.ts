import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/*
  Cookie-bound client for Server Components and Route Handlers: runs as the
  signed-in user, so row level security applies.
*/
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies; the proxy refreshes them.
          }
        },
      },
    }
  );
}
