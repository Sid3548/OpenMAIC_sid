'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useTheme } from '@/lib/hooks/use-theme';
import { Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: isDark ? '#1a1a1a' : '#fff',
    border: `1px solid ${isDark ? '#333' : '#ddd'}`,
    borderRadius: 8,
    padding: '11px 14px',
    color: isDark ? '#fff' : '#111',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      const next = searchParams.get('next') || '/create';
      router.push(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        background: isDark ? '#0a0a0a' : '#f8f8f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: isDark ? '#1a1a1a' : '#e8e8e0',
          border: 'none',
          borderRadius: 8,
          padding: '8px',
          cursor: 'pointer',
          color: isDark ? '#ccc' : '#555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1
          style={{
            color: isDark ? '#fff' : '#111',
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Sign in
        </h1>
        <p style={{ color: isDark ? '#888' : '#666', marginBottom: 28, fontSize: 14 }}>
          <Link href="/signup" style={{ color: '#c8f53a' }}>
            Create an account
          </Link>{' '}
          for 2 free credits/week.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            value={form.email}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleChange}
            style={inputStyle}
          />

          {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#c8f53a',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '12px 0',
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
