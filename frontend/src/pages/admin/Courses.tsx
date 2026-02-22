import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, BookOpen, Clock, Users as UsersIcon, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Course, CourseLesson, QuizQuestion, CourseLevel } from '../../types/admin';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import styles from './Courses.module.css';

/* ---------- Form types ---------- */
type LessonForm = { title: string; videoUrl: string; duration: number; };
type QuizForm = { question: string; options: string[]; correctAnswer: number; };
type CourseForm = {
  title: string;
  description: string;
  coverImage: string;
  language: string;
  framework: string;
  level: CourseLevel;
  status: Course['status'];
  lessons: LessonForm[];
  quiz: QuizForm[];
};

const emptyLesson: LessonForm = { title: '', videoUrl: '', duration: 0 };
const emptyQuiz: QuizForm = { question: '', options: ['', '', '', ''], correctAnswer: 0 };
const emptyForm: CourseForm = {
  title: '', description: '', coverImage: '', language: '', framework: '', level: 'beginner', status: 'draft',
  lessons: [{ ...emptyLesson }],
  quiz: [{ ...emptyQuiz }],
};

const levelColors: Record<CourseLevel, string> = { beginner: '#16a34a', intermediate: '#d97706', advanced: '#dc2626' };

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [filter, setFilter] = useState<string>('all');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'lessons' | 'quiz'>('details');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getCourses();
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---- Modal handlers ---- */
  const handleOpen = (course?: Course) => {
    if (course) {
      setEditId(course.id);
      setForm({
        title: course.title, description: course.description, coverImage: course.coverImage,
        language: course.language, framework: course.framework || '', level: course.level, status: course.status,
        lessons: course.lessons.map(l => ({ title: l.title, videoUrl: l.videoUrl, duration: l.duration })),
        quiz: course.quiz.map(q => ({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer })),
      });
    } else {
      setEditId(null);
      setForm({ ...emptyForm, lessons: [{ ...emptyLesson }], quiz: [{ ...emptyQuiz }] });
    }
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); setEditId(null); };

  const handleSave = async () => {
    const totalDuration = form.lessons.reduce((s, l) => s + l.duration, 0);
    const lessons: CourseLesson[] = form.lessons.map((l, i) => ({ id: `l${i + 1}`, title: l.title, videoUrl: l.videoUrl, duration: l.duration, order: i + 1 }));
    const quiz: QuizQuestion[] = form.quiz.filter(q => q.question.trim()).map((q, i) => ({ id: `q${i + 1}`, question: q.question, options: q.options.filter(Boolean), correctAnswer: q.correctAnswer }));

    const payload = {
      title: form.title, description: form.description, coverImage: form.coverImage,
      language: form.language, framework: form.framework || undefined, level: form.level, status: form.status,
      duration: totalDuration, lessons, quiz,
    };

    if (editId) {
      const updated = await updateCourse(editId, payload);
      setCourses(prev => prev.map(c => c.id === editId ? updated : c));
    } else {
      const created = await createCourse(payload as any);
      setCourses(prev => [...prev, created]);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    await deleteCourse(id);
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  /* ---- Lesson helpers ---- */
  const updateLesson = (idx: number, field: keyof LessonForm, value: string | number) => {
    setForm(prev => {
      const lessons = [...prev.lessons];
      lessons[idx] = { ...lessons[idx], [field]: value };
      return { ...prev, lessons };
    });
  };

  const addLesson = () => setForm(prev => ({ ...prev, lessons: [...prev.lessons, { ...emptyLesson }] }));
  const removeLesson = (idx: number) => setForm(prev => ({ ...prev, lessons: prev.lessons.filter((_, i) => i !== idx) }));

  /* ---- Quiz helpers ---- */
  const updateQuiz = (idx: number, field: keyof QuizForm, value: any) => {
    setForm(prev => {
      const quiz = [...prev.quiz];
      quiz[idx] = { ...quiz[idx], [field]: value };
      return { ...prev, quiz };
    });
  };

  const updateQuizOption = (qIdx: number, oIdx: number, value: string) => {
    setForm(prev => {
      const quiz = [...prev.quiz];
      const options = [...quiz[qIdx].options];
      options[oIdx] = value;
      quiz[qIdx] = { ...quiz[qIdx], options };
      return { ...prev, quiz };
    });
  };

  const addQuiz = () => setForm(prev => ({ ...prev, quiz: [...prev.quiz, { ...emptyQuiz, options: ['', '', '', ''] }] }));
  const removeQuiz = (idx: number) => setForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, i) => i !== idx) }));

  const filtered = filter === 'all' ? courses : courses.filter(c => c.status === filter);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <Loader text="Loading courses..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Courses</h1>
          <p>Manage courses, lessons, and quizzes</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => handleOpen()}>
          <Plus size={18} /> New Course
        </button>
      </div>

      {/* Filters */}
      <div className={styles.tabs}>
        {['all', 'published', 'draft', 'archived'].map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={styles.tabCount}>{t === 'all' ? courses.length : courses.filter(c => c.status === t).length}</span>
          </button>
        ))}
      </div>

      {/* Course list */}
      <div className={styles.list}>
        {filtered.map(course => (
          <div key={course.id} className={styles.card}>
            <div className={styles.cardMain}>
              <div className={styles.cardLeft}>
                <div className={styles.courseIcon}>
                  <BookOpen size={24} />
                </div>
                <div className={styles.courseInfo}>
                  <h3 className={styles.courseName}>{course.title}</h3>
                  <div className={styles.courseTags}>
                    <span className={styles.langTag}>{course.language}</span>
                    {course.framework && <span className={styles.fwTag}>{course.framework}</span>}
                    <span className={styles.levelTag} style={{ color: levelColors[course.level], background: levelColors[course.level] + '14' }}>
                      {course.level}
                    </span>
                  </div>
                  <div className={styles.courseMeta}>
                    <span><Clock size={13} /> {formatDuration(course.duration)}</span>
                    <span><BookOpen size={13} /> {course.lessons.length} lessons</span>
                    <span><UsersIcon size={13} /> {course.enrolledCount} enrolled</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardRight}>
                <div className={styles.completionStat}>
                  <span className={styles.completionPct}>{course.completionRate}%</span>
                  <span className={styles.completionLabel}>completion</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${course.completionRate}%` }} />
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles[`status_${course.status}`]}`}>{course.status}</span>
                <div className={styles.cardActions}>
                  <button title="Edit" onClick={() => handleOpen(course)}><Edit3 size={16} /></button>
                  <button title="Delete" className={styles.deleteAction} onClick={() => handleDelete(course.id)}><Trash2 size={16} /></button>
                  <button title="Expand" onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}>
                    {expandedCourse === course.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedCourse === course.id && (
              <div className={styles.expanded}>
                <div className={styles.expandedSection}>
                  <h4>Lessons</h4>
                  <div className={styles.lessonList}>
                    {course.lessons.map((l, i) => (
                      <div key={l.id} className={styles.lessonRow}>
                        <span className={styles.lessonNum}>{i + 1}</span>
                        <span className={styles.lessonTitle}>{l.title}</span>
                        <span className={styles.lessonDuration}>{l.duration}m</span>
                      </div>
                    ))}
                  </div>
                </div>
                {course.quiz.length > 0 && (
                  <div className={styles.expandedSection}>
                    <h4>Quiz ({course.quiz.length} questions)</h4>
                    <div className={styles.quizList}>
                      {course.quiz.map((q, i) => (
                        <div key={q.id} className={styles.quizRow}>
                          <span className={styles.quizNum}>Q{i + 1}</span>
                          <span>{q.question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className={styles.empty}>No courses found.</p>}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editId ? 'Edit Course' : 'New Course'}</h2>
              <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
            </div>

            {/* Modal Tabs */}
            <div className={styles.modalTabs}>
              {(['details', 'lessons', 'quiz'] as const).map(t => (
                <button key={t} className={`${styles.modalTab} ${activeTab === t ? styles.modalTabActive : ''}`} onClick={() => setActiveTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.modalBody}>
              {/* Details tab */}
              {activeTab === 'details' && (
                <>
                  <label className={styles.field}>
                    <span>Title</span>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Course title" />
                  </label>
                  <label className={styles.field}>
                    <span>Description</span>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Course description…" rows={3} />
                  </label>
                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span>Language</span>
                      <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} placeholder="e.g. JavaScript" />
                    </label>
                    <label className={styles.field}>
                      <span>Framework (optional)</span>
                      <input value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })} placeholder="e.g. React" />
                    </label>
                  </div>
                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span>Level</span>
                      <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value as CourseLevel })}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Status</span>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Course['status'] })}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>
                  <label className={styles.field}>
                    <span>Cover Image URL</span>
                    <input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} placeholder="https://..." />
                  </label>
                </>
              )}

              {/* Lessons tab */}
              {activeTab === 'lessons' && (
                <>
                  <p className={styles.tabHint}>Add video lessons in order. Total duration is calculated automatically.</p>
                  {form.lessons.map((lesson, idx) => (
                    <div key={idx} className={styles.lessonFormRow}>
                      <div className={styles.lessonFormGrip}><GripVertical size={16} /></div>
                      <span className={styles.lessonFormNum}>{idx + 1}</span>
                      <div className={styles.lessonFormFields}>
                        <input placeholder="Lesson title" value={lesson.title} onChange={e => updateLesson(idx, 'title', e.target.value)} />
                        <input placeholder="Video URL" value={lesson.videoUrl} onChange={e => updateLesson(idx, 'videoUrl', e.target.value)} />
                        <div className={styles.durationInput}>
                          <input type="number" placeholder="0" min={0} value={lesson.duration || ''} onChange={e => updateLesson(idx, 'duration', Number(e.target.value))} />
                          <span>min</span>
                        </div>
                      </div>
                      {form.lessons.length > 1 && (
                        <button className={styles.removeItemBtn} onClick={() => removeLesson(idx)}><X size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button className={styles.addItemBtn} onClick={addLesson}><Plus size={16} /> Add Lesson</button>
                </>
              )}

              {/* Quiz tab */}
              {activeTab === 'quiz' && (
                <>
                  <p className={styles.tabHint}>Add multiple-choice quiz questions. Mark the correct answer for each.</p>
                  {form.quiz.map((q, qIdx) => (
                    <div key={qIdx} className={styles.quizFormBlock}>
                      <div className={styles.quizFormHeader}>
                        <span>Question {qIdx + 1}</span>
                        {form.quiz.length > 1 && (
                          <button className={styles.removeItemBtn} onClick={() => removeQuiz(qIdx)}><X size={16} /></button>
                        )}
                      </div>
                      <input className={styles.quizQuestion} placeholder="Enter question…" value={q.question} onChange={e => updateQuiz(qIdx, 'question', e.target.value)} />
                      <div className={styles.optionsList}>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={styles.optionRow}>
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correctAnswer === oIdx}
                              onChange={() => updateQuiz(qIdx, 'correctAnswer', oIdx)}
                            />
                            <input placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateQuizOption(qIdx, oIdx, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button className={styles.addItemBtn} onClick={addQuiz}><Plus size={16} /> Add Question</button>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={!form.title.trim() || !form.language.trim()}>
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
