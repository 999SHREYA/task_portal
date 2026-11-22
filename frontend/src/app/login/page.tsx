'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { hasErrors, validateLogin, type FormErrors } from '@/lib/validation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ErrorMessage from '@/components/ui/ErrorMessage';
import Loader from '@/components/ui/Loader';

const DEMO_ACCOUNTS = ['admin@demo.com', 'manager@demo.com', 'dev@demo.com', 'client@demo.com'];

export default function LoginPage() {
  const { user, checking, login } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go straight to the dashboard.
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clientErrors = validateLogin(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      await login(values.email, values.password);
      // the effect above redirects once `user` is set
    } catch (err) {
      setFormError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (checking || user) return <Loader />;

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={handleSubmit} noValidate>
        <h1>Task Portal</h1>
        <p className="muted">Sign in to see your projects and tasks.</p>

        {formError && <ErrorMessage message={formError} />}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} className="btn-block">
          Sign in
        </Button>

        <div className="demo-accounts">
          <p className="muted">Demo accounts (password: Password123!)</p>
          <div className="demo-list">
            {DEMO_ACCOUNTS.map((email) => (
              <button key={email} type="button" className="link-button" onClick={() => setValues({ email, password: 'Password123!' })}>
                {email}
              </button>
            ))}
          </div>
        </div>
      </form>
    </main>
  );
}
