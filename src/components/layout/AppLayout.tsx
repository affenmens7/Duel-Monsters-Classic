import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { FloatingCards } from '../common/FloatingCards';
import { useCards } from '../../hooks/useCards';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { cards } = useCards();

  return (
    <div className={styles.layout}>
      <FloatingCards cards={cards} count={60} />
      <Header />
      <NavBar />
      <main className={styles.content}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
