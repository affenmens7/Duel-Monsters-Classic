import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { FloatingCards } from '../common/FloatingCards';
import { useCards } from '../../store/CardContext';
import { useAppData } from '../../store/AppDataContext';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { cards } = useCards();
  const { revalidate } = useAppData();
  const location = useLocation();

  // Revalidate cache on every route change (silent, no spinner)
  useEffect(() => {
    revalidate();
  }, [location.pathname, revalidate]);

  return (
    <div className={styles.layout}>
      <FloatingCards cards={cards} count={60} />
      <Header />
      <NavBar />
      <main className={styles.content} key={location.key}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
