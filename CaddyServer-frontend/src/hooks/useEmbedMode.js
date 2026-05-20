import { useEffect, useState } from 'react';

/**
 * Embed mode — when the Caddy Manager is rendered inside the IoT Dashboard's
 * iframe, the dashboard provides its own outer sidebar + header chrome. Showing
 * the manager's own sidebar/header on top would look like a doubled shell, so
 * we hide them.
 *
 * Detection (priority order):
 *   1. URL query param `?embed=1` (or `?embed=true`)
 *   2. Window is inside an iframe (window !== window.top)
 *   3. Explicit localStorage flag `caddy-embed-mode=1`
 *
 * Any truthy signal → embed mode is on. The check runs at module load and
 * applies an `embed-mode` class to <html> so CSS rules in index.css can pick
 * up the state without every component needing to read the hook.
 *
 * Mirrors the pattern used by manage-scrypted-app/src/composables/useEmbedMode.ts.
 */

function detect() {
  if (typeof window === 'undefined') return false;

  try {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('embed');
    if (v === '1' || v === 'true') return true;
  } catch {
    // ignore parse failures
  }

  try {
    if (window.self !== window.top) return true;
  } catch {
    // cross-origin frame access throws — that IS an iframe context
    return true;
  }

  try {
    if (localStorage.getItem('caddy-embed-mode') === '1') return true;
  } catch {
    // ignore storage failures
  }

  return false;
}

// Computed once at module load; treat as a render-time constant.
const initial = detect();

if (typeof document !== 'undefined' && initial) {
  document.documentElement.classList.add('embed-mode');
}

export function useEmbedMode() {
  const [isEmbedded, setIsEmbedded] = useState(initial);

  useEffect(() => {
    // Keep the class in sync if a consumer flips embedded programmatically.
    if (isEmbedded) {
      document.documentElement.classList.add('embed-mode');
    } else {
      document.documentElement.classList.remove('embed-mode');
    }
  }, [isEmbedded]);

  return {
    isEmbedded,
    setEmbedded: (v) => {
      setIsEmbedded(!!v);
      try {
        if (v) localStorage.setItem('caddy-embed-mode', '1');
        else localStorage.removeItem('caddy-embed-mode');
      } catch {
        // ignore
      }
    },
  };
}
