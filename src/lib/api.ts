/**
 * Backend API base URL.
 * In dev, defaults to "" so requests use the Vite proxy (/api → localhost:3001).
 * Override with VITE_API_BASE in .env.local if needed.
 */
const configured = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");
export const API_BASE =
  configured ?? (import.meta.env.DEV ? "" : "http://localhost:3001");

export class ApiRequestError extends Error {
  readonly url: string;
  readonly status?: number;
  readonly body?: unknown;

  constructor(
    message: string,
    url: string,
    status?: number,
    body?: unknown
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.url = url;
    this.status = status;
    this.body = body;
  }
}

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

/** fetch() with clearer errors when the backend is unreachable. */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  try {
    return await fetch(url, init);
  } catch (err: unknown) {
    console.error("[api] Network request failed:", { url, error: err });
    if (isNetworkFetchError(err)) {
      throw new ApiRequestError(
        "Could not reach backend. Make sure npm run dev is running and the backend is listening on localhost:3001.",
        url
      );
    }
    throw err;
  }
}

/** Parse a JSON error body from a failed API response. */
export async function readApiErrorMessage(
  res: Response,
  fallback: string
): Promise<{ message: string; body: unknown }> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string") {
      const details =
        typeof record.details === "string" ? record.details.trim() : "";
      if (
        record.error.includes("OpenAI") ||
        typeof record.status === "number"
      ) {
        const base =
          "TOF generation failed because the AI request failed upstream. Try again. If it keeps happening, reduce context or regenerate insights.";
        return {
          message: details ? `${base} (${details})` : base,
          body,
        };
      }
      return { message: record.error, body };
    }
  }
  return {
    message: `${fallback} (HTTP ${res.status}).`,
    body,
  };
}

/** POST JSON and throw ApiRequestError on failure. */
export async function apiPostJson<T>(
  path: string,
  payload: unknown,
  fallbackError: string
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const { message, body } = await readApiErrorMessage(res, fallbackError);
    console.error("[api] Request failed:", {
      url,
      status: res.status,
      body,
    });
    throw new ApiRequestError(message, url, res.status, body);
  }

  return (await res.json()) as T;
}
