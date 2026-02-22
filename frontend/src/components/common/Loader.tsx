import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  /** Text shown below the spinner */
  text?: string;
  /** Spinner size */
  size?: 'small' | 'medium' | 'large';
  /** Display variant */
  variant?: 'overlay' | 'fullscreen' | 'inline';
  /** Use dark background styling (for dark sections) */
  dark?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  text,
  size = 'medium',
  variant = 'overlay',
  dark = false,
}) => {
  const spinnerClass =
    size === 'small'
      ? styles.spinnerSmall
      : size === 'large'
        ? styles.spinnerLarge
        : styles.spinner;

  const wrapperClass = [
    variant === 'fullscreen'
      ? styles.overlayFullScreen
      : variant === 'inline'
        ? styles.inline
        : styles.overlay,
    dark ? styles.dark : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} role="status" aria-label="Loading">
      <div className={spinnerClass}>
        <div className={styles.ring} />
        <div className={styles.dot} />
      </div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
};

export default Loader;
