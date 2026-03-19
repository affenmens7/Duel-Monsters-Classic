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

// Admin
import { AdminGuard } from '../components/admin/AdminGuard';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminSetsPage } from '../pages/admin/AdminSetsPage';
import { AdminCardsPage } from '../pages/admin/AdminCardsPage';
import { AdminNewsPage } from '../pages/admin/AdminNewsPage';
import { AdminRoadmapPage } from '../pages/admin/AdminRoadmapPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminSetDetailPage } from '../pages/admin/AdminSetDetailPage';
import { AdminShopPage } from '../pages/admin/AdminShopPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <TitleScreen />,
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
      { path: 'shop/booster/:setName', element: <ShopPage /> },
      { path: 'shop/display/:setName', element: <ShopPage /> },
      // { path: 'duel', element: <DuelPage /> },
      // { path: 'story', element: <StoryPage /> },
      // { path: 'quests', element: <QuestsPage /> },

      // Admin routes — guarded by AdminGuard (role check)
      {
        path: 'admin',
        element: <AdminGuard />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'cards', element: <AdminCardsPage /> },
              { path: 'sets/booster', element: <AdminSetsPage /> },
              { path: 'sets/starter', element: <AdminSetsPage /> },
              { path: 'sets/:name', element: <AdminSetDetailPage /> },
              { path: 'shop/featured-sektion', element: <AdminShopPage /> },
              { path: 'shop/booster-sets', element: <AdminSetsPage /> },
              { path: 'shop/starter-decks', element: <AdminSetsPage /> },
              { path: 'news', element: <AdminNewsPage /> },
              { path: 'roadmap', element: <AdminRoadmapPage /> },
              { path: 'users', element: <AdminUsersPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
