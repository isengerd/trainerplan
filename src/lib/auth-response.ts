/** Keep proxy/runtime HTML errors out of the login UI. Never display raw bodies. */
export async function readAuthResponse<T>(response: Response): Promise<T> {
  const fallback = `Der Anmeldedienst ist derzeit nicht verfügbar (HTTP ${response.status}). Bitte versuche es später erneut.`;
  let value: unknown;
  try { value = await response.json(); }
  catch { throw new Error(fallback); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(fallback);
  return value as T;
}
