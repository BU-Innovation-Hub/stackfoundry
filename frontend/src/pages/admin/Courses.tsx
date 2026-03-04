import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Edit3, Trash2, X, BookOpen, ChevronDown, ChevronUp, ChevronRight,
  Video, FileText, Upload, Layers, FolderOpen, Lock, Unlock, Users as UsersIcon, ImageIcon
} from 'lucide-react';
import {
  lmsGetCourses, lmsCreateCourse, lmsUpdateCourse, lmsDeleteCourse,
  lmsGetLevels, lmsCreateLevel, lmsUpdateLevel, lmsDeleteLevel, lmsToggleLevelLock, lmsUnlockLevelForAll,
  lmsGetTopics, lmsCreateTopic, lmsDeleteTopic,
  lmsGetMaterials, lmsCreateVideoMaterial, lmsUploadPdfMaterial, lmsDeleteMaterial,
  uploadImage
} from '../../services/lmsService';
import { LmsCourse, LmsLevel, LmsTopic, LmsMaterial } from '../../types/lms';
import Loader from '../../components/common/Loader';
import styles from './Courses.module.css';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, LmsLevel[]>>({});
  const [topics, setTopics] = useState<Record<string, LmsTopic[]>>({});
  const [materials, setMaterials] = useState<Record<string, LmsMaterial[]>>({});
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<{
    type: 'course' | 'level' | 'editLevel' | 'topic' | 'video' | 'pdf' | null;
    parentId?: string;
    courseId?: string;
  }>({ type: null });
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try { setCourses(await lmsGetCourses()); } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadLevels = async (courseId: string) => {
    try { const data = await lmsGetLevels(courseId); setLevels(prev => ({ ...prev, [courseId]: data })); } catch (err) { console.error(err); }
  };
  const loadTopics = async (levelId: string) => {
    try { const data = await lmsGetTopics(levelId); setTopics(prev => ({ ...prev, [levelId]: data })); } catch (err) { console.error(err); }
  };
  const loadMaterials = async (levelId: string) => {
    try { const data = await lmsGetMaterials(levelId); setMaterials(prev => ({ ...prev, [levelId]: data })); } catch (err) { console.error(err); }
  };

  const toggleCourse = async (courseId: string) => {
    if (expandedCourse === courseId) { setExpandedCourse(null); return; }
    setExpandedCourse(courseId);
    if (!levels[courseId]) await loadLevels(courseId);
  };

  const toggleLevel = async (levelId: string) => {
    if (expandedLevel === levelId) { setExpandedLevel(null); return; }
    setExpandedLevel(levelId);
    if (!topics[levelId]) await loadTopics(levelId);
    if (!materials[levelId]) await loadMaterials(levelId);
  };

  /* ---- Image upload ---- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev: any) => ({ ...prev, _imageFile: file }));
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ---- CRUD ---- */
  const handleSave = async () => {
    setSaving(true);
    try {
      switch (modal.type) {
        case 'course': {
          let coverImage = formData.coverImage;
          if (formData._imageFile) {
            coverImage = await uploadImage(formData._imageFile);
          }
          if (formData._id) {
            const updated = await lmsUpdateCourse(formData._id, { title: formData.title, description: formData.description, coverImage });
            setCourses(prev => prev.map(c => c._id === updated._id ? { ...updated, enrolledCount: (c as any).enrolledCount } : c));
          } else {
            const created = await lmsCreateCourse({ title: formData.title, description: formData.description, coverImage });
            setCourses(prev => [...prev, created]);
          }
          break;
        }
        case 'level': {
          const lev = await lmsCreateLevel(modal.parentId!, {
            levelNumber: Number(formData.levelNumber), name: formData.name,
            lockedByDefault: formData.lockedByDefault !== false,
          });
          setLevels(prev => ({ ...prev, [modal.parentId!]: [...(prev[modal.parentId!] || []), lev] }));
          break;
        }
        case 'editLevel': {
          const updated = await lmsUpdateLevel(formData._id, {
            name: formData.name, levelNumber: Number(formData.levelNumber), lockedByDefault: formData.lockedByDefault,
          });
          setLevels(prev => {
            const s = { ...prev };
            for (const k of Object.keys(s)) s[k] = s[k].map(l => l._id === updated._id ? updated : l);
            return s;
          });
          break;
        }
        case 'topic': {
          const top = await lmsCreateTopic(modal.parentId!, { name: formData.name, description: formData.description });
          setTopics(prev => ({ ...prev, [modal.parentId!]: [...(prev[modal.parentId!] || []), top] }));
          break;
        }
        case 'video': {
          const mat = await lmsCreateVideoMaterial({
            youtubeUrl: formData.youtubeUrl, levelId: modal.parentId!,
            topicId: formData.topicId || undefined, title: formData.title || undefined,
          });
          setMaterials(prev => ({ ...prev, [modal.parentId!]: [...(prev[modal.parentId!] || []), mat] }));
          break;
        }
        case 'pdf': {
          if (formData.file) {
            const mat = await lmsUploadPdfMaterial(formData.file, modal.parentId!, formData.topicId || undefined, formData.title || undefined);
            setMaterials(prev => ({ ...prev, [modal.parentId!]: [...(prev[modal.parentId!] || []), mat] }));
          }
          break;
        }
      }
      closeModal();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Operation failed');
    }
    setSaving(false);
  };

  const closeModal = () => { setModal({ type: null }); setFormData({}); setImagePreview(null); };

  const openCourseModal = (course?: LmsCourse) => {
    setFormData(course ? { ...course } : {});
    setImagePreview(course?.coverImage || null);
    setModal({ type: 'course' });
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course and all its content?')) return;
    await lmsDeleteCourse(id); setCourses(prev => prev.filter(c => c._id !== id));
  };
  const handleDeleteLevel = async (courseId: string, levelId: string) => {
    if (!window.confirm('Delete this level?')) return;
    await lmsDeleteLevel(levelId);
    setLevels(prev => ({ ...prev, [courseId]: (prev[courseId] || []).filter(l => l._id !== levelId) }));
  };
  const handleToggleLock = async (courseId: string, levelId: string) => {
    try {
      const { level: updated, modifiedEnrollments } = await lmsToggleLevelLock(levelId);
      setLevels(prev => ({ ...prev, [courseId]: (prev[courseId] || []).map(l => l._id === updated._id ? updated : l) }));
      alert(`Level ${updated.lockedByDefault ? 'locked' : 'unlocked'}. ${modifiedEnrollments} enrollment(s) updated.`);
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed to toggle lock'); }
  };
  const handleUnlockForAll = async (levelId: string) => {
    if (!window.confirm('Unlock this level for ALL enrolled students?')) return;
    try { const { modifiedCount } = await lmsUnlockLevelForAll(levelId); alert(`Unlocked for ${modifiedCount} student(s).`); }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed'); }
  };
  const handleDeleteTopic = async (levelId: string, topicId: string) => {
    if (!window.confirm('Delete this topic?')) return;
    await lmsDeleteTopic(topicId);
    setTopics(prev => ({ ...prev, [levelId]: (prev[levelId] || []).filter(t => t._id !== topicId) }));
  };
  const handleDeleteMaterial = async (levelId: string, materialId: string) => {
    if (!window.confirm('Delete this material?')) return;
    await lmsDeleteMaterial(materialId);
    setMaterials(prev => ({ ...prev, [levelId]: (prev[levelId] || []).filter(m => m._id !== materialId) }));
  };

  if (loading) return <Loader text="Loading courses..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Courses</h1>
          <p>Manage courses, levels, topics, and learning materials</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => openCourseModal()}>
          <Plus size={18} /> New Course
        </button>
      </div>

      {/* Course Grid */}
      <div className={styles.grid}>
        {courses.map(course => {
          const isExpanded = expandedCourse === course._id;
          const courseLevels = levels[course._id] || [];
          return (
            <div key={course._id} className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}>
              {/* Card Header with Cover Image */}
              <div className={styles.cardCover}>
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className={styles.coverImg} />
                ) : (
                  <div className={styles.coverPlaceholder}><BookOpen size={32} /></div>
                )}
                <div className={styles.cardOverlay}>
                  <div className={styles.enrollBadge}><UsersIcon size={13} /> {course.enrolledCount ?? 0} enrolled</div>
                </div>
              </div>

              {/* Card Body */}
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{course.title}</h3>
                {course.description && <p className={styles.cardDesc}>{course.description}</p>}
                <div className={styles.cardMeta}>
                  {courseLevels.length > 0 && <span><Layers size={13} /> {courseLevels.length} levels</span>}
                  <span className={styles.cardDate}>{new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className={styles.cardFooter}>
                <div className={styles.cardActions}>
                  <button title="Edit" onClick={() => openCourseModal(course)}><Edit3 size={15} /></button>
                  <button title="Delete" className={styles.deleteAction} onClick={() => handleDeleteCourse(course._id)}><Trash2 size={15} /></button>
                </div>
                <button className={styles.expandBtn} onClick={() => toggleCourse(course._id)}>
                  {isExpanded ? <><ChevronUp size={15} /> Collapse</> : <><ChevronDown size={15} /> Manage</>}
                </button>
              </div>

              {/* Expanded: Levels, Topics, Materials */}
              {isExpanded && (
                <div className={styles.nested}>
                  <div className={styles.nestedHeader}>
                    <h4><Layers size={16} /> Levels</h4>
                    <button className={styles.smallBtn} onClick={() => {
                      setModal({ type: 'level', parentId: course._id });
                      setFormData({ levelNumber: (courseLevels.length || 0) + 1 });
                    }}><Plus size={14} /> Add Level</button>
                  </div>

                  {courseLevels.map(level => {
                    const isLevelOpen = expandedLevel === level._id;
                    return (
                      <div key={level._id} className={styles.levelCard}>
                        <div className={styles.levelHeader}>
                          <div className={styles.levelInfo} onClick={() => toggleLevel(level._id)} style={{ cursor: 'pointer' }}>
                            {isLevelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className={styles.levelNum}>L{level.levelNumber}</span>
                            <span className={styles.levelName}>{level.name}</span>
                            {level.lockedByDefault
                              ? <span className={styles.lockedBadge}><Lock size={11} /> Locked</span>
                              : <span className={styles.unlockedBadge}><Unlock size={11} /> Open</span>
                            }
                          </div>
                          <div className={styles.levelActions}>
                            <button title="Edit Level" onClick={() => {
                              setModal({ type: 'editLevel', parentId: course._id });
                              setFormData({ _id: level._id, name: level.name, levelNumber: level.levelNumber, lockedByDefault: level.lockedByDefault });
                            }}><Edit3 size={13} /></button>
                            <button title={level.lockedByDefault ? 'Unlock' : 'Lock'} onClick={() => handleToggleLock(course._id, level._id)}>
                              {level.lockedByDefault ? <Unlock size={13} /> : <Lock size={13} />}
                            </button>
                            {level.lockedByDefault && (
                              <button className={styles.unlockAllBtn} title="Unlock for all students" onClick={() => handleUnlockForAll(level._id)}>Unlock All</button>
                            )}
                            <button title="Delete" className={styles.deleteAction} onClick={() => handleDeleteLevel(course._id, level._id)}><Trash2 size={13} /></button>
                          </div>
                        </div>

                        {isLevelOpen && (
                          <div className={styles.levelContent}>
                            <div className={styles.sectionHeader}>
                              <h5><FolderOpen size={14} /> Topics & Materials</h5>
                              <button className={styles.tinyBtn} onClick={() => {
                                setModal({ type: 'topic', parentId: level._id });
                                setFormData({});
                              }}><Plus size={12} /> Topic</button>
                            </div>

                            {/* Topics */}
                            {(topics[level._id] || []).map(topic => {
                              const topicMats = (materials[level._id] || []).filter(m => {
                                const tId = typeof m.topic === 'string' ? m.topic : (m.topic as any)?._id;
                                return tId === topic._id;
                              });
                              const isTopicOpen = expandedTopic === topic._id;
                              return (
                                <div key={topic._id} className={styles.topicBlock}>
                                  <div className={styles.topicHead}>
                                    <div className={styles.topicLeft} onClick={() => setExpandedTopic(isTopicOpen ? null : topic._id)} style={{ cursor: 'pointer' }}>
                                      {isTopicOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      <FolderOpen size={14} />
                                      <span className={styles.topicName}>{topic.name}</span>
                                      <span className={styles.topicCount}>{topicMats.length} item{topicMats.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className={styles.topicActions}>
                                      <button className={styles.tinyBtn} title="Add video" onClick={() => {
                                        setModal({ type: 'video', parentId: level._id, courseId: course._id });
                                        setFormData({ topicId: topic._id });
                                      }}><Video size={12} /></button>
                                      <button className={styles.tinyBtn} title="Add PDF" onClick={() => {
                                        setModal({ type: 'pdf', parentId: level._id, courseId: course._id });
                                        setFormData({ topicId: topic._id });
                                      }}><Upload size={12} /></button>
                                      <button className={styles.deleteAction} title="Delete topic" onClick={() => handleDeleteTopic(level._id, topic._id)}><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                  {isTopicOpen && (
                                    <div className={styles.topicMaterials}>
                                      {topicMats.map(mat => (
                                        <div key={mat._id} className={styles.matRow}>
                                          {mat.type === 'video' ? <Video size={14} className={styles.matIconVideo} /> : <FileText size={14} className={styles.matIconPdf} />}
                                          <span className={styles.matTitle}>{mat.title}</span>
                                          {mat.type === 'video' && mat.youtubeDurationSeconds && (
                                            <span className={styles.matDuration}>{Math.floor(mat.youtubeDurationSeconds / 60)}:{String(mat.youtubeDurationSeconds % 60).padStart(2, '0')}</span>
                                          )}
                                          {mat.type === 'pdf' && mat.pdfSizeBytes && (
                                            <span className={styles.matDuration}>{(mat.pdfSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                                          )}
                                          <button className={styles.deleteAction} onClick={() => handleDeleteMaterial(level._id, mat._id)}><Trash2 size={12} /></button>
                                        </div>
                                      ))}
                                      {topicMats.length === 0 && <p className={styles.emptySmall}>No materials yet</p>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {(topics[level._id] || []).length === 0 && <p className={styles.emptySmall}>No topics yet. Add the first topic.</p>}

                            {/* Ungrouped materials */}
                            {(() => {
                              const ungrouped = (materials[level._id] || []).filter(m => {
                                const tId = typeof m.topic === 'string' ? m.topic : (m.topic as any)?._id;
                                return !tId;
                              });
                              if (ungrouped.length === 0 && (topics[level._id] || []).length > 0) return null;
                              return (
                                <div className={styles.ungrouped}>
                                  <div className={styles.sectionHeader}>
                                    <h5>Ungrouped Materials</h5>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                      <button className={styles.tinyBtn} onClick={() => {
                                        setModal({ type: 'video', parentId: level._id, courseId: course._id });
                                        setFormData({});
                                      }}><Video size={12} /> Video</button>
                                      <button className={styles.tinyBtn} onClick={() => {
                                        setModal({ type: 'pdf', parentId: level._id, courseId: course._id });
                                        setFormData({});
                                      }}><Upload size={12} /> PDF</button>
                                    </div>
                                  </div>
                                  {ungrouped.map(mat => (
                                    <div key={mat._id} className={styles.matRow}>
                                      {mat.type === 'video' ? <Video size={14} className={styles.matIconVideo} /> : <FileText size={14} className={styles.matIconPdf} />}
                                      <span className={styles.matTitle}>{mat.title}</span>
                                      {mat.type === 'video' && mat.youtubeDurationSeconds && (
                                        <span className={styles.matDuration}>{Math.floor(mat.youtubeDurationSeconds / 60)}:{String(mat.youtubeDurationSeconds % 60).padStart(2, '0')}</span>
                                      )}
                                      {mat.type === 'pdf' && mat.pdfSizeBytes && (
                                        <span className={styles.matDuration}>{(mat.pdfSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                                      )}
                                      <button className={styles.deleteAction} onClick={() => handleDeleteMaterial(level._id, mat._id)}><Trash2 size={12} /></button>
                                    </div>
                                  ))}
                                  {ungrouped.length === 0 && <p className={styles.emptySmall}>No loose materials.</p>}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {courseLevels.length === 0 && <p className={styles.emptySmall}>No levels yet. Add the first level.</p>}
                </div>
              )}
            </div>
          );
        })}
        {courses.length === 0 && <p className={styles.empty}>No courses yet. Create your first course.</p>}
      </div>

      {/* ======== Modal ======== */}
      {modal.type && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {modal.type === 'course' && (formData._id ? 'Edit Course' : 'New Course')}
                {modal.type === 'level' && 'New Level'}
                {modal.type === 'editLevel' && 'Edit Level'}
                {modal.type === 'topic' && 'New Topic'}
                {modal.type === 'video' && 'Add Video Material'}
                {modal.type === 'pdf' && 'Upload PDF Material'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Course Form */}
              {modal.type === 'course' && (
                <>
                  {/* Image Upload */}
                  <div className={styles.imageUpload} onClick={() => imageInputRef.current?.click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Cover" className={styles.imagePreview} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <ImageIcon size={28} />
                        <span>Click to upload cover image</span>
                      </div>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                  </div>
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
              {(modal.type === 'level' || modal.type === 'editLevel') && (
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
                    <span>Locked by default</span>
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

              {/* Video Form */}
              {modal.type === 'video' && (
                <>
                  <label className={styles.field}>
                    <span>YouTube URL or Video ID *</span>
                    <input value={formData.youtubeUrl || ''} onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                  </label>
                  <label className={styles.field}>
                    <span>Title (optional — fetched from YouTube)</span>
                    <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Custom title" />
                  </label>
                  {topics[modal.parentId!]?.length > 0 && (
                    <label className={styles.field}>
                      <span>Topic</span>
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

              {/* PDF Form */}
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
                    <span>Title (optional)</span>
                    <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </label>
                  {topics[modal.parentId!]?.length > 0 && (
                    <label className={styles.field}>
                      <span>Topic</span>
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
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
