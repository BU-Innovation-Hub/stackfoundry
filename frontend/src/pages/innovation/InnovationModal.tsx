import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Innovation.module.css';

interface InnovationModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
  labelledBy?: string;
}

const InnovationModal: React.FC<InnovationModalProps> = ({
  title,
  description,
  onClose,
  children,
  busy = false,
  labelledBy = 'innovation-modal-title',
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, []);

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className={styles.projectModal} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header className={styles.modalHeader}>
          <div>
            <h2 id={labelledBy}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            ref={closeButtonRef}
            className={styles.modalClose}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
};

export default InnovationModal;
