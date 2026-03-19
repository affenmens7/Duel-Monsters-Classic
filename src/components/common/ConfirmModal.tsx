/**
 * ConfirmModal — themed confirmation dialog matching the global Modal style.
 * Replaces window.confirm with a glassmorphism overlay + action buttons.
 */

import { useEffect, useState, type ReactNode } from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmAction {
  label: string;
  variant?: 'primary' | 'danger' | 'muted';
  onClick: () => void;
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: ConfirmAction[];
  onClose: () => void;
}

export function ConfirmModal({ open, title, children, actions, onClose }: ConfirmModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={onClose}
    >
      <div
        className={`${styles.modal} ${visible ? styles.modalVisible : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              key={action.label}
              className={`${styles.btn} ${styles[`btn_${action.variant ?? 'muted'}`]}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
