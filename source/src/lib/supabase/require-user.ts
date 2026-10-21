import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "./server";

/** Server-side auth gate for pages; proxy redirects are only optimistic. */
export async function requireUser() {
  // Opt into request-time rendering before supabase-js reads the clock (cacheComponents).
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
