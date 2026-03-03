/**
 * useProgressPersistence — Handles interruption-safe progress saving
 *
 * Ensures progress is saved during:
 *  - Tab close / browser close (beforeunload)
 *  - Tab visibility change (user switches tabs)
 *  - Network reconnection (saves queued progress when back online)
 *  - Periodic heartbeats while playing
 *
 * Uses navigator.sendBeacon for reliable save-on-close.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '../config/env';

interface UseProgressPersistenceOptions {
  /** Material ID being watched */
  materialId: string | undefined;
  /** Current accumulated watch time (total, not session) */
  watchedSeconds: number;
  /** Maximum watched position (for seek restriction) */
  maxWatchedSeconds: number;
  /** Whether the player is currently playing */
  isPlaying: boolean;
  /** Heartbeat interval in ms (default 10s) */
  heartbeatInterval?: number;
  /** Custom save function (for updating local state on success) */
  onSave?: (materialId: string, watchedSeconds: number, maxWatchedSeconds: number) => Promise<void>;
}

export function useProgressPersistence({
  materialId,
  watchedSeconds,
  maxWatchedSeconds,
  isPlaying,
  heartbeatInterval = 10_000,
  onSave,
}: UseProgressPersistenceOptions) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef({ watchedSeconds: 0, maxWatchedSeconds: 0 });
  const pendingSaveRef = useRef<{ materialId: string; watchedSeconds: number; maxWatchedSeconds: number } | null>(null);

  // Keep current values in refs for event handlers
  const materialIdRef = useRef(materialId);
  materialIdRef.current = materialId;
  const watchedSecondsRef = useRef(watchedSeconds);
  watchedSecondsRef.current = watchedSeconds;
  const maxWatchedSecondsRef = useRef(maxWatchedSeconds);
  maxWatchedSecondsRef.current = maxWatchedSeconds;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  /* ---------- Save progress helper ---------- */
  const saveProgress = useCallback(async (force = false) => {
    const matId = materialIdRef.current;
    const watched = watchedSecondsRef.current;
    const maxWatched = maxWatchedSecondsRef.current;

    if (!matId) return;

    // Skip if nothing changed (unless forced)
    if (!force &&
        watched <= lastSavedRef.current.watchedSeconds &&
        maxWatched <= lastSavedRef.current.maxWatchedSeconds) {
      return;
    }

    try {
      await onSaveRef.current?.(matId, Math.round(watched), Math.round(maxWatched));
      lastSavedRef.current = { watchedSeconds: watched, maxWatchedSeconds: maxWatched };
      pendingSaveRef.current = null;
    } catch (err) {
      // Queue for retry
      pendingSaveRef.current = { materialId: matId, watchedSeconds: watched, maxWatchedSeconds: maxWatched };
      console.warn('Failed to save progress, will retry:', err);
    }
  }, []);

  /* ---------- Beacon save (for beforeunload) ---------- */
  const beaconSave = useCallback(() => {
    const matId = materialIdRef.current;
    const watched = watchedSecondsRef.current;
    const maxWatched = maxWatchedSecondsRef.current;

    if (!matId || watched <= 0) return;

    // Use sendBeacon for reliable save on page unload
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/progress`;
    const blob = new Blob(
      [JSON.stringify({
        materialId: matId,
        watchedSeconds: Math.round(watched),
        maxWatchedSeconds: Math.round(maxWatched),
      })],
      { type: 'application/json' }
    );

    // Note: sendBeacon doesn't support cookies/auth by default
    // For authenticated requests, we need to use fetch with keepalive
    try {
      // Try fetch with keepalive first (supports credentials)
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({
          materialId: matId,
          watchedSeconds: Math.round(watched),
          maxWatchedSeconds: Math.round(maxWatched),
        }),
      }).catch(() => {
        // Fallback to sendBeacon (may not have auth)
        navigator.sendBeacon(url, blob);
      });
    } catch {
      // Final fallback
      navigator.sendBeacon(url, blob);
    }
  }, []);

  /* ---------- Heartbeat while playing ---------- */
  useEffect(() => {
    if (isPlaying && materialId) {
      // Start heartbeat
      heartbeatRef.current = setInterval(() => {
        saveProgress();
      }, heartbeatInterval);
    } else {
      // Stop heartbeat and save final progress
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Save on pause
      if (materialId) {
        saveProgress();
      }
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isPlaying, materialId, heartbeatInterval, saveProgress]);

  /* ---------- Visibility change handler ---------- */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched tabs or minimized — save immediately
        beaconSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [beaconSave]);

  /* ---------- Before unload handler ---------- */
  useEffect(() => {
    const handleBeforeUnload = () => {
      beaconSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [beaconSave]);

  /* ---------- Online/offline handler ---------- */
  useEffect(() => {
    const handleOnline = () => {
      // Retry pending save when back online
      if (pendingSaveRef.current) {
        saveProgress(true);
      }
    };

    const handleOffline = () => {
      // Nothing to do, but we could show a toast
      console.warn('Network offline — progress will be saved when reconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveProgress]);

  /* ---------- Cleanup: save on unmount ---------- */
  useEffect(() => {
    return () => {
      // Save progress when component unmounts
      beaconSave();
    };
  }, [beaconSave]);

  return {
    saveProgress,
    hasPendingSave: !!pendingSaveRef.current,
  };
}
