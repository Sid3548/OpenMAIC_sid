'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      router.push('/create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Sign in</h1>
        <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
          <Link href="/signup" style={{ color: '#c8f53a' }}>Create an account</Link>
          {' '}to get 1 free credit.
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '11px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
