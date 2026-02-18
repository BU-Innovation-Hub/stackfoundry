import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Blog.module.css';
import { api as apiClient } from '../../services/apiClient';

import { BlogPost } from '../../types/blog';

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await apiClient.get('/blogs');
        const blogData = response.data.data.map((blog: any) => ({
          ...blog,
          date: new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
        }));
        setPosts(blogData);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <section id="blog" className={styles.blog}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Latest Insights</span>
          <h2 className={styles.title}>
            From Our <span className={styles.highlight}>Blog</span>
          </h2>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading latest posts...</div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post, index) => (
              <article
                key={post._id as string}
                className={`${styles.card} ${index === 0 ? styles.cardFeatured : ''}`}
              >
                <div className={styles.cardImage}>
                  {post.featuredImage ? (
                    <img src={post.featuredImage} alt={post.title} className={styles.image} />
                  ) : (
                    <div className={styles.cardImagePlaceholder}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <span className={styles.cardCategory}>{post.category}</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardMeta}>
                    <span>{post.authorName}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{post.title}</h3>
                  <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  <Link to={`/blog/${post.slug}`} className={styles.cardLink}>
                    Read More
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className={styles.empty}>Stay tuned for our upcoming blog posts!</div>
        )}

        <div className={styles.cta}>
          <Link to="/blog" className={styles.viewAllBtn}>
            View All Posts
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Blog;
