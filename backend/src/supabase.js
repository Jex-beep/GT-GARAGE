import { createClient } from '@supabase/supabase-js';

// Service-role client — never sent to the browser
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Verify a Supabase JWT from an Authorization: Bearer <token> header.
 * Returns the user object or throws.
 */
export async function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing token'), { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
  }
  return data.user;
}
