import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/variables.css';

const NotFound: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
      background: '#ffffff',
      color: '#1a1f2e',
    }}>
      <h1 style={{
        fontSize: 'clamp(4rem, 15vw, 10rem)',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #D64A2A 0%, #f59e0b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem',
      }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ color: '#a0a0b0', marginBottom: '2rem', maxWidth: '400px' }}>
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        style={{
          padding: '0.75rem 2rem',
          background: 'linear-gradient(135deg, #D64A2A 0%, #f59e0b 100%)',
          color: '#ffffff',
          fontWeight: 600,
          borderRadius: '8px',
          textDecoration: 'none',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
