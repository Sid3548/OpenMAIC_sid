'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
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
            fontFamily: 'system-ui, sans-serif',
            background: '#0a0a0a',
            color: '#fafafa',
          }}
        >
          <div style={{ fontSize: '48px' }}>!</div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
            Something went seriously wrong
          </h1>
          <p style={{ fontSize: '15px', color: '#888', maxWidth: '400px', lineHeight: 1.6 }}>
            The application encountered a critical error. Please try refreshing the page.
          </p>
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
            Refresh page
          </button>
          {error.digest && (
            <p style={{ fontSize: '12px', color: '#555' }}>Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
