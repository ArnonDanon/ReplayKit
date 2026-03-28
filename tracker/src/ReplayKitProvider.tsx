'use client';

import { useEffect, useRef } from 'react';
import { Recorder } from './recorder';

export interface ReplayKitProviderProps {
  /** Base URL of the ReplayKit server, e.g. "https://replay.internal" */
  serverUrl: string;
  /** Tracker API key (X-Api-Key header) */
  apiKey: string;
  /** Optional key/value pairs stored with the session and visible in the player */
  metadata?: Record<string, unknown>;
  /** Set true to skip recording entirely (useful in local dev) */
  disabled?: boolean;
  children: React.ReactNode;
}

export function ReplayKitProvider({
  serverUrl,
  apiKey,
  metadata,
  disabled = false,
  children,
}: ReplayKitProviderProps) {
  const recorderRef = useRef<Recorder | null>(null);

  useEffect(() => {
    // Guard: SSR / disabled
    if (disabled || typeof window === 'undefined') return;

    const recorder = new Recorder(serverUrl, apiKey, metadata);
    recorderRef.current = recorder;
    void recorder.start();

    return () => {
      void recorder.stop();
      recorderRef.current = null;
    };
    // metadata is intentionally excluded from deps:
    // it is captured once at session start and should not trigger a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, apiKey, disabled]);

  return <>{children}</>;
}
