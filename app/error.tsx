'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '48px 24px',
        textAlign: 'center',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ fontSize: '48px' }}>!</div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Something went wrong</h1>
      <p style={{ fontSize: '15px', color: '#888', maxWidth: '400px', lineHeight: 1.6 }}>
        An unexpected error occurred. You can try again or go back to the home page.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#c8f53a',
            color: '#0a0a0a',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: '1px solid #333',
            background: 'transparent',
            color: 'inherit',
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Go home
        </a>
      </div>
      {error.digest && (
        <p style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
