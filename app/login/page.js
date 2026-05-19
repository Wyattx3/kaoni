'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError('Password မှားနေပါတယ်');
      }
    } catch (e) {
      setError('Error ဖြစ်နေပါတယ်');
    }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/logo.jpg" alt="Logo" className="login-logo" />
        <h1>KAONI</h1>
        <p>Password ထည့်ပါ</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <span className="login-error">{error}</span>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : 'ဝင်ရန်'}
          </button>
        </form>
      </div>
    </div>
  );
}
