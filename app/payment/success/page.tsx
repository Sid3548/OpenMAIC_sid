'use client';

import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans, sans-serif)',
        textAlign: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
      <h1
        style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 'clamp(32px, 5vw, 56px)',
          color: '#f0ede8',
          letterSpacing: '-1px',
          marginBottom: 16,
        }}
      >
        You&apos;re in the classroom.
      </h1>
      <p style={{ fontSize: 17, color: '#888', maxWidth: 480, lineHeight: 1.7, marginBottom: 40 }}>
        Your subscription is active. Head to the app to start your first AI-powered classroom.
      </p>
      <Link
        href="/create"
        style={{
          background: '#c8f53a',
          color: '#0a0a0a',
          padding: '14px 32px',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Open the classroom →
      </Link>
    </div>
  );
}
