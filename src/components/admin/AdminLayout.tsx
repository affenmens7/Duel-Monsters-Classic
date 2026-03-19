/**
 * AdminLayout — sidebar navigation + content area for admin pages.
 * Sidebar is grouped by sections: Dashboard, Cards & Sets, Shop, Content, Users.
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './AdminLayout.module.css';

interface NavSection {
  titleKey: string;
  items: { to: string; labelKey: string; end?: boolean }[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    titleKey: '',
    items: [
      { to: '/app/admin', labelKey: 'admin.dashboard', end: true },
    ],
  },
  {
    titleKey: 'admin.cardsAndSets',
    items: [
      { to: '/app/admin/cards', labelKey: 'admin.cardDatabase' },
      { to: '/app/admin/sets/booster', labelKey: 'admin.boosterPacks' },
      { to: '/app/admin/sets/display', labelKey: 'admin.displays' },
      { to: '/app/admin/sets/starter', labelKey: 'admin.starterDecks' },
    ],
  },
  {
    titleKey: 'admin.shop',
    items: [
      { to: '/app/admin/shop/featured-sektion', labelKey: 'admin.shopFeatured' },
      { to: '/app/admin/shop/booster-sets', labelKey: 'admin.boosterPacks' },
      { to: '/app/admin/shop/displays', labelKey: 'admin.displays' },
      { to: '/app/admin/shop/starter-decks', labelKey: 'admin.starterDecks' },
    ],
  },
  {
    titleKey: 'admin.content',
    items: [
      { to: '/app/admin/news', labelKey: 'admin.news' },
      { to: '/app/admin/roadmap', labelKey: 'admin.roadmap' },
    ],
  },
  {
    titleKey: '',
    items: [
      { to: '/app/admin/users', labelKey: 'admin.users' },
    ],
  },
];

/**
 * Check if a nav item should be highlighted.
 * Uses prefix matching: /admin/sets/booster/LOB matches /admin/sets/booster.
 */
function isNavActive(itemPath: string, currentPath: string, isEnd?: boolean): boolean {
  if (currentPath === itemPath) return true;
  if (isEnd) return false;
  if (currentPath.startsWith(itemPath + '/')) return true;
  return false;
}

export function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Admin</h2>
        <nav className={styles.nav}>
          {ADMIN_SECTIONS.map((section, i) => (
            <div key={i} className={styles.navSection}>
              {section.titleKey && (
                <span className={styles.navSectionTitle}>{t(section.titleKey)}</span>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={() =>
                    `${styles.navItem} ${isNavActive(item.to, location.pathname, item.end) ? styles.navItemActive : ''}`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
