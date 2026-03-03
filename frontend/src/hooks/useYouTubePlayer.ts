/**
 * useYouTubePlayer — React hook for the YouTube IFrame Player API
 *
 * Loads the YT IFrame API script once, creates a YT.Player instance in the
 * given container, and exposes real-time playback state so the calling
 * component can track progress accurately.
 *
 * Key features:
 *  - Uses YT.Player onStateChange for PLAYING / PAUSED / ENDED events
 *  - Polls getCurrentTime() every 500ms while PLAYING for accurate seconds
 *  - Exposes playerState, currentTime, duration, isReady, and error
 *  - Cleans up player instance on unmount or videoId change
 *  - Volume controls (setVolume, mute, unmute, toggleMute)
 *  - Seek restriction: prevents seeking beyond maxWatchedSeconds
 *  - Tracks maxWatchedSeconds in real-time as user watches
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/* YouTube IFrame API global types                                    */
/* ------------------------------------------------------------------ */

// Minimal YT type declarations so we don't need @types/youtube
declare namespace YT {
  interface PlayerVars {
    rel?: number;
    modestbranding?: number;
    playsinline?: number;
    controls?: number;
    disablekb?: number;
    fs?: number;
    iv_load_policy?: number;
    [key: string]: any;
  }
  interface PlayerEvent {
    target: Player;
  }
  interface OnStateChangeEvent {
    target: Player;
    data: number;
  }
  interface OnErrorEvent {
    target: Player;
    data: number;
  }
  class Player {
    constructor(elementId: string, options: any);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getVolume(): number;
    setVolume(volume: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
  }
}

// Extend Window to include YT namespace and callback
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export enum PlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5,
}

export interface UseYouTubePlayerOptions {
  /** The YouTube video ID to load */
  videoId: string | undefined;
  /** DOM id for the container div where the player will mount */
  containerId: string;
  /** Initial maxWatchedSeconds from saved progress (furthest point watched) */
  initialMaxWatched?: number;
  /** Called every ~500ms while playing with the current playback second */
  onTimeUpdate?: (currentTime: number, maxWatched: number) => void;
  /** Called when the video ends naturally */
  onEnded?: () => void;
  /** Called when player state changes */
  onStateChange?: (state: PlayerState) => void;
  /** Called when seeking is blocked (user tried to skip ahead) */
  onSeekBlocked?: (attemptedTime: number, maxAllowed: number) => void;
  /** Whether to disable native YouTube controls (for custom UI) */
  disableNativeControls?: boolean;
}

export interface UseYouTubePlayerReturn {
  /** Whether the YT.Player is ready */
  isReady: boolean;
  /** Current player state (-1 unstarted, 0 ended, 1 playing, 2 paused, …) */
  playerState: PlayerState;
  /** Current playback position in seconds (from getCurrentTime) */
  currentTime: number;
  /** Total video duration in seconds (from getDuration) */
  duration: number;
  /** The furthest point the user has watched (for seek restriction) */
  maxWatchedSeconds: number;
  /** Current volume (0-100) */
  volume: number;
  /** Whether the player is muted */
  isMuted: boolean;
  /** Error message if player failed to load */
  error: string | null;
  /** Programmatically play */
  play: () => void;
  /** Programmatically pause */
  pause: () => void;
  /**
   * Seek to a specific second.
   * If seconds > maxWatchedSeconds, it will be clamped.
   */
  seekTo: (seconds: number) => void;
  /** Set volume (0-100) */
  setVolume: (volume: number) => void;
  /** Mute the player */
  mute: () => void;
  /** Unmute the player */
  unmute: () => void;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Get the player ref for advanced use cases */
  getPlayer: () => YT.Player | null;
}

/* ------------------------------------------------------------------ */
/* IFrame API script loader (singleton)                               */
/* ------------------------------------------------------------------ */

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    // Already loaded?
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // The API calls this global function once it's ready
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useYouTubePlayer({
  videoId,
  containerId,
  initialMaxWatched = 0,
  onTimeUpdate,
  onEnded,
  onStateChange,
  onSeekBlocked,
  disableNativeControls = false,
}: UseYouTubePlayerOptions): UseYouTubePlayerReturn {
  const playerRef = useRef<YT.Player | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxWatchedRef = useRef<number>(initialMaxWatched);
  const lastTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.UNSTARTED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(initialMaxWatched);
  const [volume, setVolumeState] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep latest callbacks in refs so the interval doesn't capture stale values
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onSeekBlockedRef = useRef(onSeekBlocked);
  onSeekBlockedRef.current = onSeekBlocked;

  // Update maxWatchedRef when prop changes (e.g., loaded from backend)
  useEffect(() => {
    if (initialMaxWatched > maxWatchedRef.current) {
      maxWatchedRef.current = initialMaxWatched;
      setMaxWatchedSeconds(initialMaxWatched);
    }
  }, [initialMaxWatched]);

  /* ---------- Update maxWatched helper ---------- */
  const updateMaxWatched = useCallback((seconds: number) => {
    if (seconds > maxWatchedRef.current) {
      maxWatchedRef.current = seconds;
      setMaxWatchedSeconds(seconds);
    }
  }, []);

  /* ---------- Seek restriction check ---------- */
  const enforceSeekRestriction = useCallback(() => {
    const p = playerRef.current;
    if (!p || isSeekingRef.current) return;

    const current = p.getCurrentTime();
    const maxAllowed = maxWatchedRef.current;

    // Allow 2 second buffer for polling delay
    if (current > maxAllowed + 2) {
      isSeekingRef.current = true;
      p.seekTo(maxAllowed, true);
      onSeekBlockedRef.current?.(current, maxAllowed);

      // Reset flag after a short delay
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 500);
    }
  }, []);

  /* ---------- Stop polling ---------- */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /* ---------- Polling getCurrentTime while PLAYING ---------- */
  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        const t = p.getCurrentTime();
        const prevTime = lastTimeRef.current;

        // Detect normal forward progress (delta 0-2s = natural playback)
        // Update maxWatched only during natural playback
        const delta = t - prevTime;
        if (delta > 0 && delta <= 2) {
          updateMaxWatched(t);
        }

        // Detect if user seeked forward beyond maxWatched
        if (t > maxWatchedRef.current + 2) {
          enforceSeekRestriction();
        }

        lastTimeRef.current = t;
        setCurrentTime(t);
        onTimeUpdateRef.current?.(t, maxWatchedRef.current);
      }
    }, 500); // Poll every 500ms for more responsive seek detection
  }, [updateMaxWatched, enforceSeekRestriction, stopPolling]);

  /* ---------- Create / destroy player ---------- */
  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;

    const init = async () => {
      try {
        await loadYouTubeIframeApi();
      } catch {
        setError('Failed to load YouTube IFrame API');
        return;
      }

      if (destroyed) return;

      // Destroy previous player if exists
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* noop */ }
        playerRef.current = null;
      }

      setIsReady(false);
      setError(null);
      setCurrentTime(0);
      setDuration(0);
      setPlayerState(PlayerState.UNSTARTED);
      lastTimeRef.current = 0;

      const playerVars: YT.PlayerVars = {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
      };

      // Disable native controls for custom UI
      if (disableNativeControls) {
        playerVars.controls = 0;
        playerVars.disablekb = 1;
        playerVars.fs = 0;
        playerVars.iv_load_policy = 3;
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars,
        events: {
          onReady: (event: YT.PlayerEvent) => {
            if (destroyed) return;
            setIsReady(true);
            setDuration(event.target.getDuration());

            // Get initial volume state
            const vol = event.target.getVolume();
            const muted = event.target.isMuted();
            setVolumeState(vol);
            setIsMuted(muted);
            
            // If we have saved progress, seek to maxWatched position
            if (maxWatchedRef.current > 0) {
              event.target.seekTo(maxWatchedRef.current, true);
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (destroyed) return;
            const state = event.data as PlayerState;
            setPlayerState(state);
            onStateChangeRef.current?.(state);

            // Update duration (sometimes not available in onReady)
            if (typeof event.target.getDuration === 'function') {
              const d = event.target.getDuration();
              if (d > 0) setDuration(d);
            }

            if (state === PlayerState.PLAYING) {
              startPolling();
            } else {
              stopPolling();
              // Capture final time on pause / end
              if (typeof event.target.getCurrentTime === 'function') {
                const t = event.target.getCurrentTime();
                setCurrentTime(t);
                onTimeUpdateRef.current?.(t, maxWatchedRef.current);

                // If paused, check if they tried to seek ahead
                if (state === PlayerState.PAUSED) {
                  enforceSeekRestriction();
                }
              }
            }

            if (state === PlayerState.ENDED) {
              // Suppress YouTube end-screen suggestions:
              // Stop the player so the recommendation overlay never appears.
              // Seek to near-end so the thumbnail stays on the last frame.
              try {
                const dur = event.target.getDuration();
                event.target.stopVideo();
                event.target.seekTo(Math.max(0, dur - 0.1), true);
              } catch { /* noop */ }
              onEndedRef.current?.();
            }
          },
          onError: (event: YT.OnErrorEvent) => {
            if (destroyed) return;
            const code = event.data;
            const messages: Record<number, string> = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video cannot be embedded',
              150: 'Video cannot be embedded',
            };
            setError(messages[code] || `YouTube player error (code ${code})`);
          },
        },
      });
    };

    init();

    return () => {
      destroyed = true;
      stopPolling();
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* noop */ }
        playerRef.current = null;
      }
    };
  }, [videoId, containerId, disableNativeControls, startPolling, stopPolling, enforceSeekRestriction]);

  /* ---------- Controls ---------- */
  const play = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;

    // Clamp to maxWatched — prevent seeking beyond what user has watched
    const clampedSeconds = Math.max(0, Math.min(seconds, maxWatchedRef.current));

    if (seconds !== clampedSeconds) {
      onSeekBlockedRef.current?.(seconds, maxWatchedRef.current);
    }

    isSeekingRef.current = true;
    p.seekTo(clampedSeconds, true);
    lastTimeRef.current = clampedSeconds;
    setCurrentTime(clampedSeconds);

    setTimeout(() => {
      isSeekingRef.current = false;
    }, 500);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.max(0, Math.min(100, vol));
    p.setVolume(clamped);
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      p.unMute();
      setIsMuted(false);
    }
  }, [isMuted]);

  const mute = useCallback(() => {
    playerRef.current?.mute?.();
    setIsMuted(true);
  }, []);

  const unmute = useCallback(() => {
    playerRef.current?.unMute?.();
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  }, [isMuted, mute, unmute]);

  const getPlayer = useCallback(() => playerRef.current, []);

  return {
    isReady,
    playerState,
    currentTime,
    duration,
    maxWatchedSeconds,
    volume,
    isMuted,
    error,
    play,
    pause,
    seekTo,
    setVolume,
    mute,
    unmute,
    toggleMute,
    getPlayer,
  };
}
