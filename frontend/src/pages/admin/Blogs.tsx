import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit3, Trash2, Eye, X, Upload } from 'lucide-react';
import { BlogPost, IBlog, CATEGORIES, BlogCategory } from '../../types/blog';
import { getBlogs, createBlog, updateBlog, deleteBlog } from '../../services/adminService';
import { api as apiClient } from '../../services/apiClient';
import Loader from '../../components/common/Loader';
import styles from './Blogs.module.css';

type BlogForm = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  featuredImage: string;
  tags: string;
  status: IBlog['status'];
  category: BlogCategory;
  readTime: string;
};

const emptyForm: BlogForm = { title: '', excerpt: '', content: '', author: '', featuredImage: '', tags: '', status: 'draft', category: 'technology', readTime: '5 min read' };

const Blogs: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [filter, setFilter] = useState<string>('all');
  const [preview, setPreview] = useState<BlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getBlogs();
    setBlogs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = (blog?: BlogPost) => {
    if (blog) {
      setEditId(blog._id as string);
      setForm({
        title: blog.title,
        excerpt: blog.excerpt,
        content: blog.content,
        author: blog.authorName,
        featuredImage: blog.featuredImage || '',
        tags: blog.tags.join(', '),
        status: blog.status,
        category: blog.category,
        readTime: blog.readTime
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleSave = async () => {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (editId) {
        const updated = await updateBlog(editId, { ...form, tags });
        setBlogs(prev => prev.map(b => b._id === editId ? updated : b));
      } else {
        const created = await createBlog({ ...form, tags, authorName: form.author, views: 0, publishedAt: form.status === 'published' ? new Date().toISOString() : undefined });
        setBlogs(prev => [...prev, created]);
      }
      handleClose();
    } catch (error: any) {
      const details = error.response?.data?.details;
      const message = Array.isArray(details) ? details.join('\n') : (error.response?.data?.error || 'Failed to save blog post');
      alert(`Error: ${message}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit for Cloudinary Free Tier)
    if (file.size > 10 * 1024 * 1024) {
      alert('Error: File is too large. Cloudinary Free Tier only supports images up to 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, featuredImage: response.data.data.url }));
    } catch (error: any) {
      console.error('Image upload failed:', error);
      const message = error.response?.data?.error || 'Image upload failed. Please try again.';
      alert(`Error: ${message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this blog post?')) return;
    await deleteBlog(id);
    setBlogs(prev => prev.filter(b => (b._id as string) !== id));
  };

  const filtered = filter === 'all' ? blogs : blogs.filter(b => b.status === filter);

  if (loading) return <Loader text="Loading blogs..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Blog Posts</h1>
          <p>Create and manage blog content</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => handleOpen()}>
          <Plus size={18} /> New Post
        </button>
      </div>

      {/* Filters */}
      <div className={styles.tabs}>
        {['all', 'published', 'draft', 'archived'].map((t: string) => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={styles.tabCount}>{t === 'all' ? blogs.length : blogs.filter((b: BlogPost) => b.status === t).length}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map(blog => (
          <div key={blog._id as string} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.statusBadge} ${styles[`status_${blog.status}`]}`}>{blog.status}</span>
              <div className={styles.cardActions}>
                <button title="Preview" onClick={() => setPreview(blog)}><Eye size={16} /></button>
                <button title="Edit" onClick={() => handleOpen(blog)}><Edit3 size={16} /></button>
                <button title="Delete" className={styles.deleteAction} onClick={() => handleDelete(blog._id as string)}><Trash2 size={16} /></button>
              </div>
            </div>
            <h3 className={styles.cardTitle}>{blog.title}</h3>
            <p className={styles.cardExcerpt}>{blog.excerpt}</p>
            <div className={styles.cardMeta}>
              <span>{blog.authorName}</span>
              <span>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}</span>
            </div>
            <div className={styles.tagList}>
              {blog.tags.map((tag: string) => <span key={tag} className={styles.tag}>{tag}</span>)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className={styles.empty}>No blog posts found.</p>}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editId ? 'Edit Post' : 'New Post'}</h2>
              <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.field}>
                <span>Title</span>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Blog title" />
              </label>
              <label className={styles.field}>
                <span>Author</span>
                <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
              </label>
              <label className={styles.field}>
                <span>Excerpt</span>
                <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short excerpt…" rows={2} />
              </label>
              <label className={styles.field}>
                <span>Content</span>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full blog content…" rows={6} />
              </label>
              <div className={styles.field}>
                <span>Cover Image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="cover-image-upload"
                />
                {form.featuredImage ? (
                  <div className={styles.imagePreview}>
                    <img src={form.featuredImage} alt="Cover preview" />
                    <button type="button" className={styles.imageRemoveBtn} onClick={() => setForm({ ...form, featuredImage: '' })} title="Remove image">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={20} />
                    {uploading ? 'Uploading…' : 'Choose Image'}
                  </button>
                )}
              </div>
              <label className={styles.field}>
                <span>Tags (comma separated)</span>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="React, JavaScript, Frontend" />
              </label>
              <label className={styles.field}>
                <span>Category</span>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as BlogCategory })}>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Status</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as BlogPost['status'] })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Read Time (e.g., 5 min read)</span>
                <input value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} placeholder="5 min read" />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={!form.title.trim()}>
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className={styles.overlay} onClick={() => setPreview(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{preview.title}</h2>
              <button className={styles.closeBtn} onClick={() => setPreview(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.previewMeta}>By {preview.authorName} • {preview.publishedAt ? new Date(preview.publishedAt).toLocaleDateString() : 'Draft'}</p>
              <p><strong>{preview.excerpt}</strong></p>
              <div dangerouslySetInnerHTML={{ __html: preview.content }} />
              <div className={styles.tagList} style={{ marginTop: '1rem' }}>
                {preview.tags.map((tag: string) => <span key={tag} className={styles.tag}>{tag}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blogs;
