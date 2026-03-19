/**
 * useDeckDrag — drag & drop logic for the deckbuilder.
 * Card follows cursor with a click threshold to distinguish click from drag.
 */

import { useState } from 'react';
import type { Card } from '../types/card';

interface DragCallbacks {
  addCard: (card: Card) => void;
  removeFromMain: (index: number) => void;
  removeFromExtra: (index: number) => void;
  findCard: (id: number) => Card | undefined;
}

export function useDeckDrag(callbacks: DragCallbacks) {
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [dragFromDeck, setDragFromDeck] = useState<{ type: 'main' | 'extra'; index: number } | null>(null);
  const [dragIsFusion, setDragIsFusion] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  function startDrag(cardId: number, e: React.MouseEvent, from?: { type: 'main' | 'extra'; index: number }) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;
    const card = callbacks.findCard(cardId);

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!isDragging && Math.abs(dx) + Math.abs(dy) > 6) {
        isDragging = true;
        setDragCardId(cardId);
        setDragFromDeck(from ?? null);
        setDragIsFusion(card?.frameType === 'fusion');
      }
      if (isDragging) {
        setDragPos({ x: ev.clientX, y: ev.clientY });
      }
    }

    function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (!isDragging) {
        setDragCardId(null);
        setDragFromDeck(null);
        setDragPos(null);
        return;
      }

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const deckPanel = target?.closest('[data-drop="deck"]');
      const poolPanel = target?.closest('[data-drop="pool"]');

      if (deckPanel && !from) {
        // Pool → Deck: add card
        if (card) callbacks.addCard(card);
      } else if (from && !deckPanel) {
        // Deck → anywhere outside deck: remove card
        if (from.type === 'main') callbacks.removeFromMain(from.index);
        else callbacks.removeFromExtra(from.index);
      }

      setDragCardId(null);
      setDragFromDeck(null);
      setDragPos(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return { dragCardId, dragFromDeck, dragIsFusion, dragPos, startDrag };
}
