/**
 * Deck API service — CRUD operations for decks.
 */

import { env } from '../config/env';

function getToken(): string {
  return localStorage.getItem('dmc-token') ?? '';
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

export interface DeckSummary {
  id: number;
  name: string;
  card_count: string;
  created_at: string;
  updated_at: string;
}

export interface DeckCard {
  card_id: number;
  copy_index: number;
  artwork_id: number | null;
  name_de: string;
  name_en: string;
  frame_type: string;
  atk: number | null;
  def: number | null;
  level: number | null;
  attribute: string | null;
  race_en: string;
  image_path: string;
}

/** One copy in a deck with its artwork. */
export interface DeckCopy {
  cardId: number;
  artworkId: number | null;
}

export interface DeckDetail {
  id: number;
  name: string;
  user_id: number;
  cards: DeckCard[];
}

export async function fetchDecks(): Promise<DeckSummary[]> {
  const res = await fetch(`${env.api.baseUrl}/decks`, { headers: headers() });
  if (!res.ok) throw new Error('Decks konnten nicht geladen werden');
  return res.json();
}

export async function fetchDeck(id: number): Promise<DeckDetail> {
  const res = await fetch(`${env.api.baseUrl}/decks/${id}`, { headers: headers() });
  if (!res.ok) throw new Error('Deck konnte nicht geladen werden');
  return res.json();
}

export async function createDeck(name: string): Promise<{ id: number; name: string }> {
  const res = await fetch(`${env.api.baseUrl}/decks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Deck konnte nicht erstellt werden');
  return data;
}

export async function renameDeck(id: number, name: string): Promise<void> {
  const res = await fetch(`${env.api.baseUrl}/decks/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Deck konnte nicht umbenannt werden');
  }
}

export async function deleteDeck(id: number): Promise<void> {
  const res = await fetch(`${env.api.baseUrl}/decks/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error('Deck konnte nicht geloescht werden');
}

export async function saveDeckCards(
  id: number,
  mainDeck: DeckCopy[],
  extraDeck: DeckCopy[],
): Promise<void> {
  const res = await fetch(`${env.api.baseUrl}/decks/${id}/cards`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ mainDeck, extraDeck }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Deck konnte nicht gespeichert werden');
}
