import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './NavBar.module.css';

const NAV_ITEMS = [
  { to: '/app/home', labelKey: 'nav.home' },
  { to: '/app/cards', labelKey: 'nav.cards' },
  { to: '/app/deckbuilder', labelKey: 'nav.deckbuilder' },
  { to: '/app/shop', labelKey: 'nav.shop' },
  // { to: '/app/duel', labelKey: 'nav.duel' },
  // { to: '/app/story', labelKey: 'nav.story' },
  // { to: '/app/quests', labelKey: 'nav.quests' },
];

export function NavBar() {
  const { t } = useTranslation();

  return (
    <nav className={styles.subnav}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
