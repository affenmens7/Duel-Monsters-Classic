/**
 * Shop API service — buy products, get collection.
 */

import { env } from '../config/env';

interface BuyResponse {
  success: boolean;
  type: string;
  productId?: string;
  cards?: number[];
  dpRemaining: number;
}

interface CollectionItem {
  card_id: number;
  quantity: number;
}

function getToken(): string {
  return localStorage.getItem('dmc-token') ?? '';
}

export async function buyProduct(productId: string): Promise<BuyResponse> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ productId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}

export async function fetchCollection(): Promise<CollectionItem[]> {
  const response = await fetch(`${env.api.baseUrl}/shop/collection`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    throw new Error('Sammlung konnte nicht geladen werden');
  }

  return response.json();
}
