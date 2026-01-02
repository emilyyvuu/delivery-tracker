const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * Wrapper around fetch to the backend API, setting appropriate headers.
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}