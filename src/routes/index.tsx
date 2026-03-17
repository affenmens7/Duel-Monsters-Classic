/**
 * Route configuration — central definition of all app routes.
 * Add new pages here, nowhere else.
 */

import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { TitleScreen } from '../pages/TitleScreen';
import { HomePage } from '../pages/HomePage';
import { CardBrowserPage } from '../pages/CardBrowserPage';
import { NewsDetailPage } from '../pages/NewsDetailPage';
import { ShopPage } from '../pages/ShopPage';
import { DeckbuilderPage } from '../pages/DeckbuilderPage';
import { RoadmapDetailPage } from '../pages/RoadmapDetailPage';
import { StarterChoicePage } from '../pages/StarterChoicePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <TitleScreen />,
  },
  {
    path: '/choose-starter',
    element: <StarterChoicePage onComplete={() => { window.location.href = '/app'; }} />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'cards', element: <CardBrowserPage /> },
      { path: 'news/:id', element: <NewsDetailPage /> },
      { path: 'roadmap/:id', element: <RoadmapDetailPage /> },
      { path: 'deckbuilder', element: <DeckbuilderPage /> },
      { path: 'shop', element: <ShopPage /> },
      // { path: 'duel', element: <DuelPage /> },
      // { path: 'story', element: <StoryPage /> },
      // { path: 'quests', element: <QuestsPage /> },
    ],
  },
]);
