import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { api as apiClient } from '../services/apiClient';
import { IBlog } from '../types/blog';
import styles from './BlogListing.module.css';

const BlogListing: React.FC = () => {
    const [blogs, setBlogs] = useState<IBlog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const response = await apiClient.get('/blogs');
                setBlogs(response.data.data);
            } catch (error) {
                console.error('Error fetching blogs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    const filtered = useMemo(() => {
        let result = blogs;
        if (activeCategory !== 'all') {
            result = result.filter(b => b.category === activeCategory);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                b =>
                    b.title.toLowerCase().includes(q) ||
                    b.excerpt.toLowerCase().includes(q) ||
                    b.tags.some(t => t.toLowerCase().includes(q))
            );
        }
        return result;
    }, [blogs, activeCategory, search]);

    const formatDate = (date?: Date | string | null) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const categories = ['all', 'technology', 'entrepreneurship', 'events', 'tutorials', 'news', 'community'];

    return (
        <div className={styles.page}>
            <Navbar />

            {/* Hero Banner */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.heroLabel}>Our Blog</span>
                    <h1 className={styles.heroTitle}>
                        Insights & <span>Stories</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Discover the latest in technology, entrepreneurship, and innovation from our community.
                    </p>
                </div>
            </section>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="Search articles..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterBtnActive : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat === 'all' ? 'All' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results summary */}
            {!loading && (
                <div className={styles.resultsSummary}>
                    {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} found
                    {activeCategory !== 'all' && ` in ${activeCategory}`}
                    {search.trim() && ` for "${search}"`}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className={styles.loading}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={styles.skeletonCard}>
                            <div className={styles.skeletonImage} />
                            <div className={styles.skeletonBody}>
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Blog Grid */}
            {!loading && (
                <div className={styles.grid}>
                    {filtered.map(blog => (
                        <Link
                            key={blog._id as string}
                            to={`/blog/${blog.slug}`}
                            className={styles.card}
                        >
                            <div className={styles.cardImage}>
                                {blog.featuredImage ? (
                                    <img src={blog.featuredImage} alt={blog.title} />
                                ) : (
                                    <div className={styles.cardImagePlaceholder}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    </div>
                                )}
                                <span className={styles.cardCategory}>{blog.category}</span>
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.cardMeta}>
                                    <span>{blog.authorName}</span>
                                    <span>•</span>
                                    <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                                    <span>•</span>
                                    <span>{blog.readTime}</span>
                                </div>
                                <h3 className={styles.cardTitle}>{blog.title}</h3>
                                <p className={styles.cardExcerpt}>{blog.excerpt}</p>
                                <span className={styles.cardReadMore}>
                                    Read More
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </Link>
                    ))}

                    {filtered.length === 0 && (
                        <div className={styles.empty}>
                            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <h3>No articles found</h3>
                            <p>Try adjusting your search or filter to find what you're looking for.</p>
                        </div>
                    )}
                </div>
            )}

            <Footer />
        </div>
    );
};

export default BlogListing;
