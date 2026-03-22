'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError(data.message || 'Signup failed');
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
      style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Create account</h1>
        <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
          1 free activity credit on signup.{' '}
          <Link href="/login" style={{ color: '#c8f53a' }}>Already have an account?</Link>
        </p>

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

        <p style={{ color: '#555', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
          By signing up you agree to our terms of service.
        </p>
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
