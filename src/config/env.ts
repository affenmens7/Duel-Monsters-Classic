/**
 * Environment configuration — all external URLs and settings
 * are read from environment variables (.env file).
 * This is the ONLY place in the app that reads import.meta.env.
 */

export const env = {
  ygoproApi: {
    baseUrl: import.meta.env.VITE_YGOPRO_API_URL as string,
    imageUrl: import.meta.env.VITE_YGOPRO_IMAGE_URL as string,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_URL as string,
  },
} as const;
