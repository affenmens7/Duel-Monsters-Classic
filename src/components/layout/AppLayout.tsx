import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { FloatingCards } from '../common/FloatingCards';
import { useCards } from '../../store/CardContext';
import { useAuth } from '../../store/AuthContext';
import { fetchCollection } from '../../services/shopApi';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { cards } = useCards();
  const { user } = useAuth();
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetchCollection()
      .then((items) => {
        setOwnedIds(new Set(items.map((i) => i.card_id)));
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className={styles.layout}>
      <FloatingCards cards={cards} count={60} ownedCardIds={ownedIds} />
      <Header />
      <NavBar />
      <main className={styles.content}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
