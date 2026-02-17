import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { api as apiClient } from '../services/apiClient';
import { IBlog } from '../types/blog';
import styles from './BlogPost.module.css';

const BlogPost: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [blog, setBlog] = useState<IBlog | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const hasFetched = useRef(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        // Guard against React Strict Mode double-mount
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchBlog = async () => {
            try {
                const response = await apiClient.get(`/blogs/slug/${slug}`);
                setBlog(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 404) {
                    setNotFound(true);
                }
                console.error('Error fetching blog:', error);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchBlog();
    }, [slug]);

    const formatDate = (date?: Date | string | null) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
    };

    // Loading state
    if (loading) {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>Loading article...</p>
                </div>
                <Footer />
            </div>
        );
    }

    // Not found
    if (notFound || !blog) {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.errorContainer}>
                    <h2>Article Not Found</h2>
                    <p>The blog post you're looking for doesn't exist or may have been removed.</p>
                    <Link to="/blog" className={styles.errorLink}>
                        Browse All Posts
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Navbar />

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link to="/blog" className={styles.backLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Blog
                    </Link>

                    <span className={styles.category}>{blog.category}</span>
                    <h1 className={styles.title}>{blog.title}</h1>

                    <div className={styles.meta}>
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            {blog.authorName}
                        </span>
                        <span className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatDate(blog.publishedAt || blog.createdAt)}
                        </span>
                        <span className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {blog.readTime}
                        </span>
                        <span className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {blog.views} views
                        </span>
                    </div>
                </div>
            </section>

            {/* Featured Image */}
            {blog.featuredImage && (
                <div className={styles.featuredImage}>
                    <img src={blog.featuredImage} alt={blog.title} />
                </div>
            )}

            {/* Article Body */}
            <article className={styles.article}>
                <div
                    className={styles.articleContent}
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {/* Tags */}
                {blog.tags.length > 0 && (
                    <div className={styles.tags}>
                        {blog.tags.map(tag => (
                            <span key={tag} className={styles.tag}>#{tag}</span>
                        ))}
                    </div>
                )}

                {/* Share */}
                <div className={styles.shareBar}>
                    <span className={styles.shareLabel}>Share:</span>
                    <button
                        className={styles.shareBtn}
                        title="Copy link"
                        onClick={handleCopyLink}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </button>
                    <a
                        className={styles.shareBtn}
                        title="Share on Twitter"
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                        </svg>
                    </a>
                    <a
                        className={styles.shareBtn}
                        title="Share on LinkedIn"
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                            <rect x="2" y="9" width="4" height="12" />
                            <circle cx="4" cy="4" r="2" />
                        </svg>
                    </a>
                </div>
            </article>

            <Footer />
        </div>
    );
};

export default BlogPost;
