/**
 * Admin Course Manager
 * Manage courses, levels, topics, and materials (video + PDF)
 * This is a separate admin page for LMS content management
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, X, BookOpen, ChevronDown, ChevronUp,
  Video, FileText, Upload, Layers, FolderOpen
} from 'lucide-react';
import {
  lmsGetCourses, lmsCreateCourse, lmsUpdateCourse, lmsDeleteCourse,
  lmsGetLevels, lmsCreateLevel, lmsDeleteLevel,
  lmsGetTopics, lmsCreateTopic, lmsDeleteTopic,
  lmsGetMaterials, lmsCreateVideoMaterial, lmsUploadPdfMaterial, lmsDeleteMaterial
} from '../../services/lmsService';
import { LmsCourse, LmsLevel, LmsTopic, LmsMaterial } from '../../types/lms';
import Loader from '../../components/common/Loader';
import styles from './CourseManager.module.css';

const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, LmsLevel[]>>({});
  const [topics, setTopics] = useState<Record<string, LmsTopic[]>>({});
  const [materials, setMaterials] = useState<Record<string, LmsMaterial[]>>({});
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: 'course' | 'level' | 'topic' | 'video' | 'pdf' | null;
    parentId?: string;
    courseId?: string;
  }>({ type: null });
  const [formData, setFormData] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lmsGetCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadLevels = async (courseId: string) => {
    try {
      const data = await lmsGetLevels(courseId);
      setLevels(prev => ({ ...prev, [courseId]: data }));
    } catch (err) {
      console.error('Failed to load levels:', err);
    }
  };

  const loadTopics = async (levelId: string) => {
    try {
      const data = await lmsGetTopics(levelId);
      setTopics(prev => ({ ...prev, [levelId]: data }));
    } catch (err) {
      console.error('Failed to load topics:', err);
    }
  };

  const loadMaterials = async (levelId: string) => {
    try {
      const data = await lmsGetMaterials(levelId);
      setMaterials(prev => ({ ...prev, [levelId]: data }));
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const toggleCourse = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      if (!levels[courseId]) await loadLevels(courseId);
    }
  };

  const toggleLevel = async (levelId: string) => {
    if (expandedLevel === levelId) {
      setExpandedLevel(null);
    } else {
      setExpandedLevel(levelId);
      if (!topics[levelId]) await loadTopics(levelId);
      if (!materials[levelId]) await loadMaterials(levelId);
    }
  };

  // ---- CRUD handlers ----
  const handleSave = async () => {
    setUploading(true);
    try {
      switch (modal.type) {
        case 'course': {
          if (formData._id) {
            const updated = await lmsUpdateCourse(formData._id, { title: formData.title, description: formData.description });
            setCourses(prev => prev.map(c => c._id === updated._id ? updated : c));
          } else {
            const created = await lmsCreateCourse({ title: formData.title, description: formData.description });
            setCourses(prev => [...prev, created]);
          }
          break;
        }
        case 'level': {
          const lev = await lmsCreateLevel(modal.parentId!, {
            levelNumber: Number(formData.levelNumber),
            name: formData.name,
            lockedByDefault: formData.lockedByDefault !== false,
          });
          setLevels(prev => ({
            ...prev,
            [modal.parentId!]: [...(prev[modal.parentId!] || []), lev],
          }));
          break;
        }
        case 'topic': {
          const top = await lmsCreateTopic(modal.parentId!, {
            name: formData.name,
            description: formData.description,
          });
          setTopics(prev => ({
            ...prev,
            [modal.parentId!]: [...(prev[modal.parentId!] || []), top],
          }));
          break;
        }
        case 'video': {
          const mat = await lmsCreateVideoMaterial({
            youtubeUrl: formData.youtubeUrl,
            levelId: modal.parentId!,
            topicId: formData.topicId || undefined,
            title: formData.title || undefined,
          });
          setMaterials(prev => ({
            ...prev,
            [modal.parentId!]: [...(prev[modal.parentId!] || []), mat],
          }));
          break;
        }
        case 'pdf': {
          if (formData.file) {
            const mat = await lmsUploadPdfMaterial(
              formData.file,
              modal.parentId!,
              formData.topicId || undefined,
              formData.title || undefined
            );
            setMaterials(prev => ({
              ...prev,
              [modal.parentId!]: [...(prev[modal.parentId!] || []), mat],
            }));
          }
          break;
        }
      }
      setModal({ type: null });
      setFormData({});
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Operation failed');
    }
    setUploading(false);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course and all its content?')) return;
    await lmsDeleteCourse(id);
    setCourses(prev => prev.filter(c => c._id !== id));
  };

  const handleDeleteLevel = async (courseId: string, levelId: string) => {
    if (!window.confirm('Delete this level?')) return;
    await lmsDeleteLevel(levelId);
    setLevels(prev => ({
      ...prev,
      [courseId]: (prev[courseId] || []).filter(l => l._id !== levelId),
    }));
  };

  const handleDeleteTopic = async (levelId: string, topicId: string) => {
    if (!window.confirm('Delete this topic?')) return;
    await lmsDeleteTopic(topicId);
    setTopics(prev => ({
      ...prev,
      [levelId]: (prev[levelId] || []).filter(t => t._id !== topicId),
    }));
  };

  const handleDeleteMaterial = async (levelId: string, materialId: string) => {
    if (!window.confirm('Delete this material?')) return;
    await lmsDeleteMaterial(materialId);
    setMaterials(prev => ({
      ...prev,
      [levelId]: (prev[levelId] || []).filter(m => m._id !== materialId),
    }));
  };

  if (loading) return <Loader text="Loading courses..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>LMS Course Manager</h1>
          <p>Manage courses, levels, topics, and learning materials</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setModal({ type: 'course' }); setFormData({}); }}>
          <Plus size={18} /> New Course
        </button>
      </div>

      {/* Course List */}
      <div className={styles.list}>
        {courses.map(course => (
          <div key={course._id} className={styles.card}>
            <div className={styles.cardMain}>
              <div className={styles.cardLeft}>
                <div className={styles.icon}><BookOpen size={22} /></div>
                <div>
                  <h3 className={styles.cardTitle}>{course.title}</h3>
                  {course.description && <p className={styles.cardDesc}>{course.description}</p>}
                </div>
              </div>
              <div className={styles.cardActions}>
                <button title="Edit" onClick={() => { setModal({ type: 'course' }); setFormData(course); }}>
                  <Edit3 size={16} />
                </button>
                <button title="Delete" className={styles.deleteBtn} onClick={() => handleDeleteCourse(course._id)}>
                  <Trash2 size={16} />
                </button>
                <button title="Expand" onClick={() => toggleCourse(course._id)}>
                  {expandedCourse === course._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* Expanded: Levels */}
            {expandedCourse === course._id && (
              <div className={styles.nested}>
                <div className={styles.nestedHeader}>
                  <h4><Layers size={16} /> Levels</h4>
                  <button className={styles.smallBtn} onClick={() => {
                    setModal({ type: 'level', parentId: course._id });
                    setFormData({ levelNumber: (levels[course._id]?.length || 0) + 1 });
                  }}>
                    <Plus size={14} /> Add Level
                  </button>
                </div>

                {(levels[course._id] || []).map(level => (
                  <div key={level._id} className={styles.levelCard}>
                    <div className={styles.levelHeader}>
                      <div className={styles.levelInfo} onClick={() => toggleLevel(level._id)} style={{ cursor: 'pointer' }}>
                        <span className={styles.levelNum}>L{level.levelNumber}</span>
                        <span>{level.name}</span>
                        {level.lockedByDefault && <span className={styles.lockedBadge}>Locked</span>}
                      </div>
                      <div className={styles.cardActions}>
                        <button title="Delete Level" className={styles.deleteBtn} onClick={() => handleDeleteLevel(course._id, level._id)}>
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => toggleLevel(level._id)}>
                          {expandedLevel === level._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Level: Topics + Materials */}
                    {expandedLevel === level._id && (
                      <div className={styles.levelContent}>
                        {/* Topics */}
                        <div className={styles.section}>
                          <div className={styles.sectionHeader}>
                            <h5><FolderOpen size={14} /> Topics</h5>
                            <button className={styles.tinyBtn} onClick={() => {
                              setModal({ type: 'topic', parentId: level._id });
                              setFormData({});
                            }}>
                              <Plus size={12} /> Topic
                            </button>
                          </div>
                          {(topics[level._id] || []).map(topic => (
                            <div key={topic._id} className={styles.topicRow}>
                              <span>{topic.name}</span>
                              <button className={styles.deleteBtn} onClick={() => handleDeleteTopic(level._id, topic._id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          {(topics[level._id] || []).length === 0 && <p className={styles.empty}>No topics yet</p>}
                        </div>

                        {/* Materials */}
                        <div className={styles.section}>
                          <div className={styles.sectionHeader}>
                            <h5>Materials</h5>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className={styles.tinyBtn} onClick={() => {
                                setModal({ type: 'video', parentId: level._id, courseId: course._id });
                                setFormData({});
                              }}>
                                <Video size={12} /> Video
                              </button>
                              <button className={styles.tinyBtn} onClick={() => {
                                setModal({ type: 'pdf', parentId: level._id, courseId: course._id });
                                setFormData({});
                              }}>
                                <Upload size={12} /> PDF
                              </button>
                            </div>
                          </div>
                          {(materials[level._id] || []).map(mat => (
                            <div key={mat._id} className={styles.materialRow}>
                              {mat.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                              <span className={styles.materialTitle}>{mat.title}</span>
                              {mat.type === 'video' && mat.youtubeDurationSeconds && (
                                <span className={styles.duration}>
                                  {Math.floor(mat.youtubeDurationSeconds / 60)}:{String(mat.youtubeDurationSeconds % 60).padStart(2, '0')}
                                </span>
                              )}
                              {mat.type === 'pdf' && mat.pdfSizeBytes && (
                                <span className={styles.duration}>
                                  {(mat.pdfSizeBytes / 1024 / 1024).toFixed(1)} MB
                                </span>
                              )}
                              <button className={styles.deleteBtn} onClick={() => handleDeleteMaterial(level._id, mat._id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          {(materials[level._id] || []).length === 0 && <p className={styles.empty}>No materials yet</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(levels[course._id] || []).length === 0 && <p className={styles.empty}>No levels yet. Add the first level.</p>}
              </div>
            )}
          </div>
        ))}
        {courses.length === 0 && <p className={styles.empty}>No courses found. Create your first course.</p>}
      </div>

      {/* Modal */}
      {modal.type && (
        <div className={styles.overlay} onClick={() => setModal({ type: null })}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {modal.type === 'course' && (formData._id ? 'Edit Course' : 'New Course')}
                {modal.type === 'level' && 'New Level'}
                {modal.type === 'topic' && 'New Topic'}
                {modal.type === 'video' && 'Add Video Material'}
                {modal.type === 'pdf' && 'Upload PDF Material'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setModal({ type: null })}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Course Form */}
              {modal.type === 'course' && (
                <>
                  <label className={styles.field}>
                    <span>Title *</span>
                    <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Course title" />
                  </label>
                  <label className={styles.field}>
                    <span>Description</span>
                    <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Course description…" rows={3} />
                  </label>
                </>
              )}

              {/* Level Form */}
              {modal.type === 'level' && (
                <>
                  <label className={styles.field}>
                    <span>Level Number *</span>
                    <input type="number" value={formData.levelNumber || ''} onChange={e => setFormData({ ...formData, levelNumber: e.target.value })} min={1} />
                  </label>
                  <label className={styles.field}>
                    <span>Name *</span>
                    <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Level name" />
                  </label>
                  <label className={styles.checkField}>
                    <input type="checkbox" checked={formData.lockedByDefault !== false} onChange={e => setFormData({ ...formData, lockedByDefault: e.target.checked })} />
                    <span>Locked by default (students must complete prior level)</span>
                  </label>
                </>
              )}

              {/* Topic Form */}
              {modal.type === 'topic' && (
                <>
                  <label className={styles.field}>
                    <span>Name *</span>
                    <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Topic name" />
                  </label>
                  <label className={styles.field}>
                    <span>Description</span>
                    <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                  </label>
                </>
              )}

              {/* Video Material Form */}
              {modal.type === 'video' && (
                <>
                  <label className={styles.field}>
                    <span>YouTube URL or Video ID *</span>
                    <input value={formData.youtubeUrl || ''} onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=... or video ID" />
                  </label>
                  <label className={styles.field}>
                    <span>Title (optional — fetched from YouTube if blank)</span>
                    <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Custom title" />
                  </label>
                  {topics[modal.parentId!]?.length > 0 && (
                    <label className={styles.field}>
                      <span>Topic (optional)</span>
                      <select value={formData.topicId || ''} onChange={e => setFormData({ ...formData, topicId: e.target.value })}>
                        <option value="">No topic</option>
                        {topics[modal.parentId!].map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {/* PDF Material Form */}
              {modal.type === 'pdf' && (
                <>
                  <label className={styles.field}>
                    <span>PDF File * (max 25MB)</span>
                    <input type="file" accept="application/pdf" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setFormData({ ...formData, file: f });
                    }} />
                  </label>
                  <label className={styles.field}>
                    <span>Title (optional — uses filename if blank)</span>
                    <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </label>
                  {topics[modal.parentId!]?.length > 0 && (
                    <label className={styles.field}>
                      <span>Topic (optional)</span>
                      <select value={formData.topicId || ''} onChange={e => setFormData({ ...formData, topicId: e.target.value })}>
                        <option value="">No topic</option>
                        {topics[modal.parentId!].map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setModal({ type: null })}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={uploading}>
                {uploading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
