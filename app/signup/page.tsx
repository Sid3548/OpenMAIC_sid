'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useTheme } from '@/lib/hooks/use-theme';
import { Sun, Moon } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
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

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Signup failed');
        return;
      }

      // Auto sign-in after signup
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign-in failed. Please log in manually.');
        router.push('/login');
        return;
      }

      router.push('/create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{ background: isDark ? '#0a0a0a' : '#f8f8f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}
    >
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        style={{ position: 'absolute', top: 20, right: 20, background: isDark ? '#1a1a1a' : '#e8e8e0', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: isDark ? '#ccc' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ color: isDark ? '#fff' : '#111', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Create account</h1>
        <p style={{ color: isDark ? '#888' : '#666', marginBottom: 28, fontSize: 14 }}>
          1 free activity credit on signup.{' '}
          <Link href="/login" style={{ color: '#c8f53a' }}>Already have an account?</Link>
        </p>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/create' })}
          style={{
            background: isDark ? '#1a1a1a' : '#fff',
            color: isDark ? '#fff' : '#111',
            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
            borderRadius: 8,
            padding: '12px 0',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: isDark ? '#333' : '#ddd' }} />
          <span style={{ color: isDark ? '#666' : '#999', fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: isDark ? '#333' : '#ddd' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            name="name"
            type="text"
            placeholder="Full name"
            required
            value={form.name}
            onChange={handleChange}
            style={inputStyle}
          />
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
            name="mobile"
            type="tel"
            placeholder="Mobile number (e.g. 9876543210)"
            required
            value={form.mobile}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min. 8 characters)"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            name="confirm"
            type="password"
            placeholder="Confirm password"
            required
            value={form.confirm}
            onChange={handleChange}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{error}</p>
          )}

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
            {loading ? 'Creating account…' : 'Sign up — get 1 free credit'}
          </button>
        </form>

        <p style={{ color: isDark ? '#555' : '#888', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
          By signing up you agree to our terms of service.
        </p>
      </div>
    </main>
  );
}

