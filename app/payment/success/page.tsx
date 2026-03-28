'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

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
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c8f53a 0%, #22c55e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            marginBottom: 32,
            boxShadow: '0 0 60px rgba(200, 245, 58, 0.3)',
          }}
        >
          &#10003;
        </div>
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
        <p
          style={{
            fontSize: 17,
            color: '#888',
            maxWidth: 480,
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          Your subscription is active and 30 credits have been added to your account. Start
          generating AI classrooms now.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            Create a classroom →
          </Link>
          <Link
            href="/library"
            style={{
              border: '1px solid #333',
              color: '#f0ede8',
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            My Library
          </Link>
        </div>
      </div>
    </div>
  );
}
