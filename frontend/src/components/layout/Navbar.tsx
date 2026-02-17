import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'About Us', href: '/#about' },
    { name: 'Explore', href: '/#explore' },
    { name: 'Events', href: '/#events' },
    { name: 'Founders', href: '/#founders' },
    { name: 'Blog', href: '/#blog' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>TECH</span>
          <span className={styles.logoAccent}>+</span>
        </Link>

        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.open : ''}`}>
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className={styles.navLink}>
              {link.name}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link to="/join" className={styles.joinBtn}>
            Join Hub
          </Link>
          <Link to="/login" className={styles.navLink}>
            Login
          </Link>


          <button
            className={styles.menuToggle}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburger}></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
