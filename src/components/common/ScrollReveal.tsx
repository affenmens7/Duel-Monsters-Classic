/**
 * ScrollReveal — wraps children and fades them in when scrolled into view.
 * Usage: <ScrollReveal><section>...</section></ScrollReveal>
 */

import { type ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './ScrollReveal.module.css';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
}

export function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  const { ref, visible } = useScrollReveal(0.1);

  return (
    <div
      ref={ref}
      className={`${styles.wrapper} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
