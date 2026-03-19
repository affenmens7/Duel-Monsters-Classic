/**
 * SettingsModal — reusable admin settings popup.
 * Renders a dark overlay + centered panel with title, children (field rows),
 * and save/cancel actions. Used across admin pages for editing entities.
 */

import { type ReactNode } from 'react';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  open: boolean;
  title: string;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  resultMsg?: string | null;
  resultOk?: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
  children: ReactNode;
}

export function SettingsModal({
  open, title, saving, saveLabel, cancelLabel, deleteLabel,
  resultMsg, resultOk,
  onSave, onClose, onDelete, children,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose}>x</button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
        <div className={styles.actions}>
          <button
            className={styles.saveBtn}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? '...' : (saveLabel ?? 'Save')}
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            {cancelLabel ?? 'Cancel'}
          </button>
          {resultMsg && (
            <span className={`${styles.resultMsg} ${resultOk ? styles.resultOk : styles.resultErr}`}>
              {resultMsg}
            </span>
          )}
        </div>
        {onDelete && (
          <div className={styles.dangerZone}>
            <button className={styles.deleteBtn} disabled={saving} onClick={onDelete}>
              {deleteLabel ?? 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Re-export field helpers for consumers */
export { styles as settingsModalStyles };
