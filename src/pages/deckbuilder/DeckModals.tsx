/**
 * DeckModals — confirm (delete/clear) modal + new deck modal for the deckbuilder.
 */

import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/common/Modal';
import type { ConfirmAction } from '../../hooks/useDeckbuilder';
import styles from './DeckModals.module.css';

interface ConfirmModalProps {
  confirmAction: ConfirmAction;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ confirmAction, onClose, onConfirm }: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={confirmAction !== null}
      onClose={onClose}
      title={confirmAction?.type === 'delete' ? t('deckbuilder.deleteDeckTitle') : t('deckbuilder.clearDeckTitle')}
    >
      <div className={styles.modalBody}>
        <p className={styles.modalText}>
          {confirmAction?.type === 'delete'
            ? t('deckbuilder.deleteDeckWarning', { name: confirmAction.deckName ?? '' })
            : t('deckbuilder.clearDeckWarning')}
        </p>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className={styles.dangerBtn} onClick={onConfirm}>
            {confirmAction?.type === 'delete' ? t('deckbuilder.deleteDeckConfirm') : t('deckbuilder.clearDeckConfirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface NewDeckModalProps {
  open: boolean;
  name: string;
  error: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function NewDeckModal({ open, name, error, onClose, onNameChange, onSubmit }: NewDeckModalProps) {
  const { t } = useTranslation();
  const isValid = name.trim() && !error;

  return (
    <Modal open={open} onClose={onClose} title={t('deckbuilder.newDeck')}>
      <div className={styles.modalBody}>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder={t('deckbuilder.deckNamePrompt')}
          autoFocus
          maxLength={32}
          className={styles.nameInput}
          style={{ borderColor: error ? 'rgba(239,68,68,0.4)' : undefined }}
        />
        {error && <p className={styles.nameError}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.createBtn}
            onClick={onSubmit}
            disabled={!isValid}
            style={{ opacity: isValid ? 1 : 0.4, cursor: isValid ? 'pointer' : 'not-allowed' }}
          >
            {t('common.create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
