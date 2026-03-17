/**
 * AdminLayout — sidebar navigation + content area for admin pages.
 * Sidebar is grouped by sections: Dashboard, Cards & Sets, Shop, Content, Users.
 */

import { NavLink, Outlet } from 'react-router-dom';
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
      { to: '/app/admin/sets/starter', labelKey: 'admin.starterDecks' },
    ],
  },
  {
    titleKey: 'admin.shop',
    items: [
      { to: '/app/admin/shop-config', labelKey: 'admin.boosterAndDecks' },
      { to: '/app/admin/cosmetics', labelKey: 'admin.cosmetics' },
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

export function AdminLayout() {
  const { t } = useTranslation();

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
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
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
