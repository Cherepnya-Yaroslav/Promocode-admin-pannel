import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppFooter } from '../components/primitives/AppFooter';
import {
  type RegisterFormValues,
  registerSchema
} from '../auth/auth-schemas';
import { ApiError } from '../lib/api';
import { useToast } from '../toast/toast-provider';

export function RegisterPage(): JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex@example.com',
      password: 'Password123!'
    }
  });

  async function handleSubmit(values: RegisterFormValues): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await auth.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password
      });
      pushToast({
        title: 'Account created',
        description: 'Your secure operator profile is ready.',
        tone: 'success'
      });
      navigate('/app/overview', { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to create the account.';
      setErrorMessage(message);
      pushToast({
        title: 'Registration failed',
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
            <span className="eyebrow-pill__badge">Foundation</span>
            Stage 8 only
          </p>
          <h1>
            Create an operator account
            <span className="auth-hero__accent"> for promo intelligence.</span>
          </h1>
          <p>
            This form exists to complete the auth foundation. Full operational forms
            remain reserved for later stages.
          </p>
        </div>
        <form className="auth-card auth-card--wide" onSubmit={form.handleSubmit(handleSubmit)}>
          <div>
            <h2>Register</h2>
            <p>Provision an account before entering the console.</p>
          </div>
          <div className="form-grid">
            <label>
              First name
              <input {...form.register('firstName')} type="text" />
              <small>{form.formState.errors.firstName?.message}</small>
            </label>
            <label>
              Last name
              <input {...form.register('lastName')} type="text" />
              <small>{form.formState.errors.lastName?.message}</small>
            </label>
          </div>
          <label>
            Email
            <input {...form.register('email')} type="email" />
            <small>{form.formState.errors.email?.message}</small>
          </label>
          <label>
            Password
            <input {...form.register('password')} type="password" />
            <small>{form.formState.errors.password?.message}</small>
          </label>
          {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
          <button
            className="button button--primary button--full"
            disabled={isSubmitting || !form.formState.isValid}
            type="submit"
          >
            {isSubmitting ? 'Creating account...' : 'Create secure access'}
          </button>
          <p className="auth-card__footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
      <AppFooter />
    </div>
  );
}
