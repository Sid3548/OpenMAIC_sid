'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentFailedPage() {
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
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
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
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            marginBottom: 32,
            color: '#fff',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.2)',
          }}
        >
          &#10005;
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(28px, 5vw, 48px)',
            color: '#f0ede8',
            letterSpacing: '-1px',
            marginBottom: 16,
          }}
        >
          Payment didn&apos;t go through.
        </h1>
        <p
          style={{
            fontSize: 17,
            color: '#888',
            maxWidth: 480,
            lineHeight: 1.7,
            marginBottom: 16,
          }}
        >
          Your card was not charged. This could be due to insufficient funds, an expired card, or a
          temporary bank issue.
        </p>
        <p
          style={{
            fontSize: 14,
            color: '#666',
            maxWidth: 480,
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          Please try again with the same or a different payment method. If the problem persists,
          contact your bank or reach out to us.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/#pricing"
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
            Try again →
          </Link>
          <a
            href="mailto:support@openclassroom.online"
            style={{
              border: '1px solid #333',
              color: '#f0ede8',
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 15,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
