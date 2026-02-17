import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, User, LayoutDashboard, Shield, LogOut } from 'lucide-react';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { logout } = useAuth();

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
          {/* Always show Join Hub / Dashboard as a primary CTA */}
          <Link to={isAuthenticated ? "/dashboard" : "/join"} className={styles.joinBtn}>
            {isAuthenticated ? "Dashboard" : "Join Hub"}
          </Link>

          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <button
                className={styles.userMenuToggle}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
              >
                <div className={styles.avatar}>
                  <User size={18} />
                </div>
                <span className={styles.userName}>{user?.name || 'User'}</span>
                <ChevronDown size={14} className={`${styles.chevron} ${isUserMenuOpen ? styles.chevronOpen : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.userEmail}>{user?.email}</p>
                    <span className={styles.userRole}>{user?.role}</span>
                  </div>

                  {user?.role === 'admin' && (
                    <Link to="/admin" className={styles.dropdownItem}>
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}

                  <Link to="/dashboard" className={styles.dropdownItem}>
                    <LayoutDashboard size={16} /> My Dashboard
                  </Link>

                  <div className={styles.divider}></div>

                  <button onClick={logout} className={`${styles.dropdownItem} ${styles.logoutBtn}`}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className={styles.navLink}>
              Login
            </Link>
          )}
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
