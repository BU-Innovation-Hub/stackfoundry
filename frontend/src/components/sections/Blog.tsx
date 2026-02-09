import React from 'react';
import styles from './Blog.module.css';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
}

const Blog: React.FC = () => {
  const posts: BlogPost[] = [
    {
      id: 1,
      title: 'How to Build a Successful Tech Startup in Africa',
      excerpt: 'Key insights and strategies for launching and scaling your tech venture in the African market.',
      author: 'Dr. Sarah Moyo',
      date: 'Feb 1, 2026',
      category: 'Entrepreneurship',
      readTime: '8 min read',
    },
    {
      id: 2,
      title: 'The Rise of AI in African Innovation',
      excerpt: 'Exploring how artificial intelligence is transforming industries across the continent.',
      author: 'Michael Chen',
      date: 'Jan 28, 2026',
      category: 'Technology',
      readTime: '6 min read',
    },
    {
      id: 3,
      title: '5 Lessons from Our Latest Hackathon Winners',
      excerpt: 'What we learned from the teams that built winning solutions in just 48 hours.',
      author: 'Naledi Tau',
      date: 'Jan 20, 2026',
      category: 'Events',
      readTime: '5 min read',
    },
  ];

  return (
    <section id="blog" className={styles.blog}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Latest Insights</span>
          <h2 className={styles.title}>
            From Our <span className={styles.highlight}>Blog</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {posts.map((post, index) => (
            <article 
              key={post.id} 
              className={`${styles.card} ${index === 0 ? styles.cardFeatured : ''}`}
            >
              <div className={styles.cardImage}>
                <div className={styles.cardImagePlaceholder}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <span className={styles.cardCategory}>{post.category}</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardMeta}>
                  <span>{post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.cardExcerpt}>{post.excerpt}</p>
                <a href={`/blog/${post.id}`} className={styles.cardLink}>
                  Read More
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.cta}>
          <a href="/blog" className={styles.viewAllBtn}>
            View All Posts
          </a>
        </div>
      </div>
    </section>
  );
};

export default Blog;
