import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

const Button: React.FC<Props> = ({ variant = 'primary', children, ...rest }) => {
  const styles: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid',
    borderColor: variant === 'primary' ? '#B83D1F' : '#6c757d',
    background: variant === 'primary' ? '#D64A2A' : '#adb5bd',
    color: 'white',
    cursor: 'pointer',
  };
  return (
    <button style={styles} {...rest}>
      {children}
    </button>
  );
};

export default Button;
