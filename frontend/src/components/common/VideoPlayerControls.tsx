/**
 * VideoPlayerControls — Custom YouTube player controls overlay
 *
 * Features:
 *  - Play/Pause button
 *  - Progress bar with seek restriction visualization
 *  - Volume slider with mute toggle
 *  - Current time / duration display
 *  - Visual indicator for max watched position
 */

import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward } from 'lucide-react';
import styles from './VideoPlayerControls.module.css';

interface VideoPlayerControlsProps {
  /** Is the video currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total video duration in seconds */
  duration: number;
  /** Maximum watched position (seekable limit) */
  maxWatchedSeconds: number;
  /** Current volume (0-100) */
  volume: number;
  /** Is the player muted */
  isMuted: boolean;
  /** Is the player ready */
  isReady: boolean;
  /** Callback to play */
  onPlay: () => void;
  /** Callback to pause */
  onPause: () => void;
  /** Callback to seek (will be clamped to maxWatchedSeconds) */
  onSeek: (seconds: number) => void;
  /** Callback to set volume */
  onVolumeChange: (volume: number) => void;
  /** Callback to toggle mute */
  onToggleMute: () => void;
  /** Callback when user attempts to seek beyond allowed position */
  onSeekBlocked?: (message: string) => void;
}

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  maxWatchedSeconds,
  volume,
  isMuted,
  isReady,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSeekBlocked,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [seekBlockedMessage, setSeekBlockedMessage] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- Time formatting ---------- */
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  /* ---------- Progress percentages ---------- */
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPercent = duration > 0 ? (maxWatchedSeconds / duration) * 100 : 0;

  /* ---------- Handle progress bar click ---------- */
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;
    const targetSeconds = (percent / 100) * duration;

    // Check if attempting to seek beyond max watched
    if (targetSeconds > maxWatchedSeconds + 1) {
      const message = `Cannot skip ahead. Watch up to ${formatTime(maxWatchedSeconds)} first.`;
      setSeekBlockedMessage(message);
      onSeekBlocked?.(message);

      // Clear previous timeout
      if (blockMessageTimeoutRef.current) {
        clearTimeout(blockMessageTimeoutRef.current);
      }
      // Hide message after 3 seconds
      blockMessageTimeoutRef.current = setTimeout(() => {
        setSeekBlockedMessage(null);
      }, 3000);

      // Still seek, but it will be clamped by the hook
    }

    onSeek(targetSeconds);
  }, [duration, maxWatchedSeconds, onSeek, onSeekBlocked]);

  /* ---------- Volume hover handlers ---------- */
  const handleVolumeEnter = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeLeave = () => {
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
  };

  if (!isReady) return null;

  return (
    <div className={styles.controlsWrapper}>
      {/* Seek blocked message */}
      {seekBlockedMessage && (
        <div className={styles.seekBlockedMessage}>
          <SkipForward size={16} />
          {seekBlockedMessage}
        </div>
      )}

      <div className={styles.controls}>
        {/* Play / Pause */}
        <button
          className={styles.playPauseBtn}
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>

        {/* Progress Bar */}
        <div
          ref={progressRef}
          className={styles.progressWrapper}
          onClick={handleProgressClick}
        >
          {/* Background track */}
          <div className={styles.progressTrack}>
            {/* Max watched zone (where user CAN seek) */}
            <div
              className={styles.maxWatchedBar}
              style={{ width: `${maxWatchedPercent}%` }}
            />
            {/* Current position */}
            <div
              className={styles.currentBar}
              style={{ width: `${currentPercent}%` }}
            />
          </div>
          {/* Scrubber thumb */}
          <div
            className={styles.scrubberThumb}
            style={{ left: `${currentPercent}%` }}
          />
        </div>

        {/* Time display */}
        <div className={styles.timeDisplay}>
          <span>{formatTime(currentTime)}</span>
          <span className={styles.timeSeparator}>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Volume control */}
        <div
          className={styles.volumeWrapper}
          onMouseEnter={handleVolumeEnter}
          onMouseLeave={handleVolumeLeave}
        >
          <button
            className={styles.volumeBtn}
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {showVolumeSlider && (
            <div className={styles.volumeSliderContainer}>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className={styles.volumeSlider}
                aria-label="Volume"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerControls;
