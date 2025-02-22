// src/lib/apiKey.ts
import { env } from '$env/dynamic/private';

/**
 * Validates the API key provided in the request headers against the value in the environment.
 * @param request - The incoming Request object.
 * @returns {boolean} - Returns true if the API key is valid.
 */
export function validateApiKey(request: Request): boolean {
  const providedKey = request.headers.get('x-api-key');
  if (!providedKey) {
    return false;
  }
  return providedKey === env.API_KEY;
}

