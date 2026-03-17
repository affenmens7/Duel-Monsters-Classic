/**
 * Auth API service — all auth-related API calls.
 */

import { env } from '../config/env';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    tag: string;
    displayName: string;
    role: string;
    dp: number;
  };
}

interface ApiError {
  error: string;
}

async function authRequest(endpoint: string, body: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(`${env.api.baseUrl}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: AuthResponse | ApiError = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error ?? 'Anfrage fehlgeschlagen');
  }

  return data as AuthResponse;
}

export function registerUser(username: string, email: string, password: string) {
  return authRequest('register', { username, email, password });
}

export function loginUser(username: string, password: string) {
  return authRequest('login', { username, password });
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(`${env.api.baseUrl}/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Session abgelaufen');
  }

  return response.json();
}
