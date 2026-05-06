import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppFooter } from '../components/primitives/AppFooter';
import { type LoginFormValues, loginSchema } from '../auth/auth-schemas';
import { ApiError } from '../lib/api';
import { useToast } from '../toast/toast-provider';

export function LoginPage(): JSX.Element {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: 'alex@example.com',
      password: 'Password123!'
    }
  });

  async function handleSubmit(values: LoginFormValues): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await auth.login({
        email: values.email.trim(),
        password: values.password
      });
      pushToast({
        title: 'Secure session established',
        description: 'You are now inside the PromoCode Manager workspace.',
        tone: 'success'
      });
      navigate((location.state as { from?: string } | null)?.from ?? '/app/overview', {
        replace: true
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to sign in right now.';
      setErrorMessage(message);
      pushToast({
        title: 'Login failed',
        description: message,
        tone: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page-shell">
      <section className="auth-page">
        <div className="auth-hero">
          <p className="eyebrow-pill">
            <span className="eyebrow-pill__badge">Live Console</span>
            Promo performance, order flow, and discount exposure in one place
          </p>
          <h1>
            Enter PromoCode Manager
            <span className="auth-hero__accent"> and stay on top of every discount move.</span>
          </h1>
          <p>
            Review promo effectiveness, manage active instruments, monitor user impact,
            and control order-side applications from a single operational workspace.
          </p>
        </div>
        <form className="auth-card" onSubmit={form.handleSubmit(handleSubmit)}>
          <div>
            <h2>Sign in</h2>
            <p>Use your operator account to enter the console.</p>
          </div>
          <label>
            Email
            <input autoComplete="email" {...form.register('email')} type="email" />
            <small>{form.formState.errors.email?.message}</small>
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              {...form.register('password')}
              type="password"
            />
            <small>{form.formState.errors.password?.message}</small>
          </label>
          {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
          <button
            className="button button--primary button--full"
            disabled={isSubmitting || !form.formState.isValid}
            type="submit"
          >
            {isSubmitting ? 'Authorizing...' : 'Enter workspace'}
          </button>
          <p className="auth-card__footer">
            No account yet? <Link to="/register">Create one</Link>
          </p>
        </form>
      </section>
      <AppFooter />
    </div>
  );
}
