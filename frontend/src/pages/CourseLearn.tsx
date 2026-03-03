/**
 * Course Learn Page
 * Student view with YouTube IFrame Player API for accurate progress tracking
 * Player events (PLAYING / PAUSED / ENDED) drive progress — no blind timers
 * Features:
 *  - Custom player controls with seek restriction
 *  - Prevents fast-forwarding beyond watched content
 *  - Handles interruptions (tab close, network loss)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, ChevronUp, ChevronRight, Lock, CheckCircle,
  PlayCircle, FileText, Download, AlertCircle
} from 'lucide-react';
import {
  lmsGetCourse, lmsGetMaterials, lmsGetTopics, lmsGetProgress,
  lmsUpdateProgress, lmsDownloadPdf, lmsGetMyEnrollments
} from '../services/lmsService';
import { LmsCourse, LmsLevel, LmsTopic, LmsMaterial, LmsProgress, LmsEnrollment } from '../types/lms';
import { useYouTubePlayer, PlayerState } from '../hooks/useYouTubePlayer';
import { useProgressPersistence } from '../hooks/useProgressPersistence';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import VideoPlayerControls from '../components/common/VideoPlayerControls';
import styles from './CourseLearn.module.css';

const PLAYER_CONTAINER_ID = 'yt-player-container';

const CourseLearn: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [levels, setLevels] = useState<LmsLevel[]>([]);
  const [enrollment, setEnrollment] = useState<LmsEnrollment | null>(null);
  const [materialsByLevel, setMaterialsByLevel] = useState<Record<string, LmsMaterial[]>>({});
  const [topicsByLevel, setTopicsByLevel] = useState<Record<string, LmsTopic[]>>({});
  const [progressMap, setProgressMap] = useState<Record<string, LmsProgress>>({});
  const [loading, setLoading] = useState(true);

  const [selectedMaterial, setSelectedMaterial] = useState<LmsMaterial | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [seekBlockedToast, setSeekBlockedToast] = useState<string | null>(null);

  // Get initial maxWatched from saved progress
  const initialMaxWatched = useMemo(() => {
    if (!selectedMaterial) return 0;
    const prog = progressMap[selectedMaterial._id];
    return prog?.maxWatchedSeconds || 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?._id, progressMap]);

  /* -------- YouTube IFrame Player API hook -------- */
  const {
    isReady: ytReady,
    playerState: ytState,
    currentTime: ytCurrentTime,
    duration: ytDuration,
    maxWatchedSeconds: ytMaxWatched,
    volume: ytVolume,
    isMuted: ytMuted,
    error: ytError,
    play: ytPlay,
    pause: ytPause,
    seekTo: ytSeekTo,
    setVolume: ytSetVolume,
    toggleMute: ytToggleMute,
  } = useYouTubePlayer({
    videoId: selectedMaterial?.type === 'video' ? selectedMaterial.youtubeVideoId : undefined,
    containerId: PLAYER_CONTAINER_ID,
    initialMaxWatched,
    disableNativeControls: true, // Use custom controls
    onEnded: useCallback(() => {
      // Video ended — progress will be saved by persistence hook
    }, []),
    onSeekBlocked: useCallback((attempted: number, maxAllowed: number) => {
      setSeekBlockedToast(`Cannot skip ahead. Watch the video first.`);
      setTimeout(() => setSeekBlockedToast(null), 3000);
    }, []),
  });

  /* -------- Refresh enrollment data helper -------- */
  const refreshEnrollment = useCallback(async () => {
    const enrollmentData = await lmsGetMyEnrollments();
    const myEnrollment = enrollmentData.find(e => {
      const cId = typeof e.course === 'string' ? e.course : e.course._id;
      return cId === courseId;
    });
    setEnrollment(myEnrollment || null);
  }, [courseId]);

  /* -------- Save progress helper (called by persistence hook) -------- */
  const handleSaveProgress = useCallback(
    async (materialId: string, watchedSeconds: number, maxWatchedSeconds: number) => {
      const result = await lmsUpdateProgress(materialId, Math.round(watchedSeconds), Math.round(maxWatchedSeconds));
      setProgressMap(prev => ({ ...prev, [materialId]: result.progress }));

      if (result.newLevelUnlocked) {
        refreshEnrollment();
      }
    },
    [refreshEnrollment],
  );

  /* -------- Progress persistence (handles interruptions, heartbeats) -------- */
  useProgressPersistence({
    materialId: selectedMaterial?.type === 'video' ? selectedMaterial._id : undefined,
    watchedSeconds: ytCurrentTime, // Use state value, not ref
    maxWatchedSeconds: ytMaxWatched,
    isPlaying: ytState === PlayerState.PLAYING,
    heartbeatInterval: 10_000, // 10 seconds
    onSave: handleSaveProgress,
  });

  /* -------- Load course data -------- */
  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [courseData, enrollmentData] = await Promise.all([
        lmsGetCourse(courseId),
        lmsGetMyEnrollments(),
      ]);

      setCourse(courseData.course);
      setLevels(courseData.levels);

      const myEnrollment = enrollmentData.find(e => {
        const cId = typeof e.course === 'string' ? e.course : e.course._id;
        return cId === courseId;
      });
      setEnrollment(myEnrollment || null);

      // Load materials and topics for all levels
      const matPromises = courseData.levels.map(l => lmsGetMaterials(l._id).catch(() => []));
      const topicPromises = courseData.levels.map(l => lmsGetTopics(l._id).catch(() => []));
      const [matResults, topicResults] = await Promise.all([
        Promise.all(matPromises),
        Promise.all(topicPromises),
      ]);
      const matMap: Record<string, LmsMaterial[]> = {};
      const topMap: Record<string, LmsTopic[]> = {};
      courseData.levels.forEach((l, i) => {
        matMap[l._id] = matResults[i];
        topMap[l._id] = topicResults[i];
      });
      setMaterialsByLevel(matMap);
      setTopicsByLevel(topMap);

      // Load progress
      try {
        const progressData = await lmsGetProgress(courseId);
        const pMap: Record<string, LmsProgress> = {};
        progressData.forEach(p => {
          const matId = typeof p.material === 'string' ? p.material : p.material._id;
          pMap[matId] = p;
        });
        setProgressMap(pMap);
      } catch {
        // No progress yet
      }

      // Auto-expand first unlocked level
      if (courseData.levels.length > 0) {
        setExpandedLevel(courseData.levels[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  /* -------- Helpers -------- */
  const isLevelUnlocked = (levelId: string): boolean => {
    if (user?.role === 'admin') return true;

    // Levels with lockedByDefault === false are always available
    const level = levels.find(l => l._id === levelId);
    if (level && !level.lockedByDefault) return true;

    if (!enrollment) return false;
    return enrollment.levelsUnlocked.some(l => {
      const id = typeof l === 'string' ? l : l._id;
      return id === levelId;
    });
  };

  const getMaterialProgress = (materialId: string): LmsProgress | undefined => {
    return progressMap[materialId];
  };

  const getLevelCompletion = (levelId: string): { completed: number; total: number } => {
    const mats = materialsByLevel[levelId] || [];
    const completed = mats.filter(m => getMaterialProgress(m._id)?.completed).length;
    return { completed, total: mats.length };
  };

  const getTopicCompletion = (topicId: string, levelId: string): { completed: number; total: number } => {
    const levelMats = materialsByLevel[levelId] || [];
    const topicMats = levelMats.filter(m => {
      const tId = typeof m.topic === 'string' ? m.topic : m.topic?._id;
      return tId === topicId;
    });
    const completed = topicMats.filter(m => getMaterialProgress(m._id)?.completed).length;
    return { completed, total: topicMats.length };
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  /* -------- Select material -------- */
  const selectMaterial = (material: LmsMaterial) => {
    setSelectedMaterial(material);
  };

  const handleDownloadPdf = async (materialId: string) => {
    try {
      const { url } = await lmsDownloadPdf(materialId);
      window.open(url, '_blank');

      // Mark PDF as viewed
      const result = await lmsUpdateProgress(materialId, 1);
      setProgressMap(prev => ({ ...prev, [materialId]: result.progress }));

      if (result.newLevelUnlocked) {
        refreshEnrollment();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Download failed');
    }
  };

  /* -------- Derived player stats -------- */
  /**
   * Get watch progress percentage based on furthest point watched (maxWatchedSeconds)
   * This shows how much of the video the user has actually watched through
   */
  const getVideoProgressPercent = (): number => {
    if (!selectedMaterial) return 0;
    const dur = ytDuration || selectedMaterial.youtubeDurationSeconds || 0;
    if (!dur) return 0;
    
    // Use ytMaxWatched (from hook) which tracks furthest watched point in real-time
    // Fall back to saved progress from DB if hook hasn't updated yet
    const prog = getMaterialProgress(selectedMaterial._id);
    const maxWatched = Math.max(ytMaxWatched, prog?.maxWatchedSeconds || 0);
    
    return Math.min(100, Math.round((maxWatched / dur) * 100));
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  /* -------- Render -------- */
  if (loading) return <Loader text="Loading course..." />;
  if (!course) return <div className={styles.error}>Course not found</div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/courses')}>
          <ChevronLeft size={20} /> Courses
        </button>
        <h1>{course.title}</h1>
        {course.description && <p>{course.description}</p>}
      </div>

      <div className={styles.layout}>
        {/* Sidebar: Course Structure */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Course Content</h3>
          {levels.map(level => {
            const unlocked = isLevelUnlocked(level._id);
            const { completed, total } = getLevelCompletion(level._id);
            const isExpanded = expandedLevel === level._id;
            const levelTopics = topicsByLevel[level._id] || [];
            const levelMats = materialsByLevel[level._id] || [];

            // Materials not assigned to any topic
            const ungrouped = levelMats.filter(m => {
              const tId = typeof m.topic === 'string' ? m.topic : m.topic?._id;
              return !tId;
            });

            return (
              <div key={level._id} className={`${styles.levelBlock} ${!unlocked ? styles.locked : ''}`}>
                {/* Module header */}
                <div
                  className={styles.levelHead}
                  onClick={() => unlocked && setExpandedLevel(isExpanded ? null : level._id)}
                >
                  <div className={styles.levelLeft}>
                    {!unlocked ? (
                      <Lock size={16} />
                    ) : completed === total && total > 0 ? (
                      <CheckCircle size={16} className={styles.completedIcon} />
                    ) : (
                      <span className={styles.levelBadge}>{level.levelNumber}</span>
                    )}
                    <span className={styles.levelName}>{level.name}</span>
                  </div>
                  <div className={styles.levelRight}>
                    <span className={styles.progressText}>{completed}/{total}</span>
                    {unlocked && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </div>
                </div>

                {/* Completion bar */}
                {unlocked && total > 0 && (
                  <div className={styles.levelProgressBar}>
                    <div
                      className={styles.levelProgressFill}
                      style={{ width: `${Math.round((completed / total) * 100)}%` }}
                    />
                  </div>
                )}

                {/* Expanded: Topics + Materials */}
                {isExpanded && unlocked && (
                  <div className={styles.levelContent}>
                    {levelTopics.map((topic, tIdx) => {
                      const { completed: tDone, total: tAll } = getTopicCompletion(topic._id, level._id);
                      const isTopicOpen = expandedTopics[topic._id];
                      const topicMats = levelMats.filter(m => {
                        const tId = typeof m.topic === 'string' ? m.topic : m.topic?._id;
                        return tId === topic._id;
                      });

                      return (
                        <div key={topic._id} className={styles.topicBlock}>
                          <div
                            className={`${styles.topicHead} ${tDone === tAll && tAll > 0 ? styles.topicDone : ''}`}
                            onClick={() => toggleTopic(topic._id)}
                          >
                            <div className={styles.topicLeft}>
                              {tDone === tAll && tAll > 0 ? (
                                <CheckCircle size={14} className={styles.completedIcon} />
                              ) : isTopicOpen ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                              <span className={styles.topicLabel}>
                                {level.levelNumber}.{tIdx + 1} {topic.name}
                              </span>
                            </div>
                            <span className={styles.topicProgress}>{tDone}/{tAll}</span>
                          </div>

                          {isTopicOpen && (
                            <div className={styles.topicMaterials}>
                              {topicMats.map((mat, mIdx) => {
                                const prog = getMaterialProgress(mat._id);
                                const isActive = selectedMaterial?._id === mat._id;
                                return (
                                  <div
                                    key={mat._id}
                                    className={`${styles.materialItem} ${isActive ? styles.active : ''} ${prog?.completed ? styles.completed : ''}`}
                                    onClick={() => selectMaterial(mat)}
                                  >
                                    <span className={styles.materialNum}>
                                      {level.levelNumber}.{tIdx + 1}.{mIdx + 1}
                                    </span>
                                    {mat.type === 'video' ? <PlayCircle size={14} /> : <FileText size={14} />}
                                    <span className={styles.materialName}>{mat.title}</span>
                                    {prog?.completed && <CheckCircle size={13} className={styles.checkIcon} />}
                                  </div>
                                );
                              })}
                              {topicMats.length === 0 && (
                                <p className={styles.emptyTopic}>No materials yet</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Materials not assigned to any topic */}
                    {ungrouped.map(mat => {
                      const prog = getMaterialProgress(mat._id);
                      const isActive = selectedMaterial?._id === mat._id;
                      return (
                        <div
                          key={mat._id}
                          className={`${styles.materialItem} ${isActive ? styles.active : ''} ${prog?.completed ? styles.completed : ''}`}
                          onClick={() => selectMaterial(mat)}
                        >
                          {mat.type === 'video' ? <PlayCircle size={14} /> : <FileText size={14} />}
                          <span className={styles.materialName}>{mat.title}</span>
                          {prog?.completed && <CheckCircle size={13} className={styles.checkIcon} />}
                        </div>
                      );
                    })}

                    {levelMats.length === 0 && levelTopics.length === 0 && (
                      <p className={styles.emptyLevel}>No content in this module</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Main: YouTube IFrame Player API + Material Info */}
        <main className={styles.main}>
          {selectedMaterial ? (
            <>
              {/* ---- YouTube IFrame Player ---- */}
              {selectedMaterial.type === 'video' && selectedMaterial.youtubeVideoId && (
                <div className={styles.playerSection}>
                  <div className={`${styles.videoWrapper} youtube-player-wrapper`}>
                    {/* The YT IFrame API replaces this div with its iframe */}
                    <div id={PLAYER_CONTAINER_ID} className={styles.videoIframe} />
                    {!ytReady && !ytError && (
                      <div className={styles.playerLoading}>Loading player…</div>
                    )}

                    {/* Custom Player Controls (seek-restricted) */}
                    {ytReady && (
                      <VideoPlayerControls
                        isPlaying={ytState === PlayerState.PLAYING}
                        currentTime={ytCurrentTime}
                        duration={ytDuration}
                        maxWatchedSeconds={ytMaxWatched}
                        volume={ytVolume}
                        isMuted={ytMuted}
                        isReady={ytReady}
                        onPlay={ytPlay}
                        onPause={ytPause}
                        onSeek={ytSeekTo}
                        onVolumeChange={ytSetVolume}
                        onToggleMute={ytToggleMute}
                      />
                    )}
                  </div>

                  {ytError && (
                    <div className={styles.playerError}>
                      <AlertCircle size={18} /> {ytError}
                    </div>
                  )}

                  {/* Seek blocked toast */}
                  {seekBlockedToast && (
                    <div className={styles.seekBlockedToast}>
                      {seekBlockedToast}
                    </div>
                  )}
                </div>
              )}

              {/* ---- Material Info ---- */}
              <div className={styles.materialInfo}>
                <h2>{selectedMaterial.title}</h2>

                {selectedMaterial.type === 'video' && (
                  <div className={styles.videoMeta}>
                    <span>
                      Duration: {formatTime(ytDuration || selectedMaterial.youtubeDurationSeconds || 0)}
                    </span>
                    {(() => {
                      const prog = getMaterialProgress(selectedMaterial._id);
                      if (prog) {
                        return (
                          <span className={prog.completed ? styles.progressCompleted : styles.progressInfo}>
                            {prog.completed
                              ? '✓ Completed'
                              : `${getVideoProgressPercent()}% progress`}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {ytState === PlayerState.PLAYING && (
                      <span className={styles.liveIndicator}>● Playing</span>
                    )}
                    {ytState === PlayerState.PAUSED && ytReady && (
                      <span className={styles.pausedIndicator}>❚❚ Paused</span>
                    )}
                  </div>
                )}

                {selectedMaterial.type === 'pdf' && (
                  <div className={styles.pdfSection}>
                    <p>📄 {selectedMaterial.pdfOriginalName || 'PDF Document'}</p>
                    {selectedMaterial.pdfSizeBytes && (
                      <span className={styles.pdfSize}>
                        {(selectedMaterial.pdfSizeBytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                    <button
                      className={styles.downloadBtn}
                      onClick={() => handleDownloadPdf(selectedMaterial._id)}
                    >
                      <Download size={18} /> Download PDF
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.placeholder}>
              <PlayCircle size={48} />
              <h3>Select a lesson to start learning</h3>
              <p>Choose a video or PDF from the course content on the left</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseLearn;
