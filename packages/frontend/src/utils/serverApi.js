import { supabase } from "@/supabaseClient";

export class ServerApiError extends Error {
  constructor(status, body) {
    super(body?.message || "Request failed");
    this.status = status;
    this.code = body?.error || "request_failed";
    this.details = body || {};
  }
}

// Calls a Netlify Function with the current Supabase session. Authorization
// is enforced server-side; this only forwards the user's access token.
export async function callServer(name, { method, body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ServerApiError(401, { error: "unauthenticated", message: "Please sign in again" });

  let response;
  try {
    response = await fetch(`/.netlify/functions/${name}`, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ServerApiError(0, { error: "network_error", message: "Could not reach the server. Check your connection." });
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON error page; fall through with the status code.
  }
  if (!response.ok) throw new ServerApiError(response.status, data);
  return data;
}
