'use client';
import { safeReturnPath } from '../access-policy';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest, currentUser, doctorAccess, logout, staffLogin, staffLoginOptions, type StaffLoginRole, type AuthUser } from '../api';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  normalizePhone,
  validateAuth,
  type AuthMode,
  type AuthValues,
  type AuthErrors,
} from '../validation';
import styles from './AuthScreen.module.css';

const titles: Record<AuthMode, string> = {
  'sign-up': 'Create your account',
  'sign-in': 'Sign in',
  admin: 'Admin sign in',
};

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const [values, setValues] = useState<AuthValues>({
    firstName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const isSignUp = mode === 'sign-up';
  const router = useRouter();
  const requestedRole = useSearchParams().get('role');
  const [loginRole, setLoginRole] = useState<StaffLoginRole>(requestedRole === 'ADMIN' || requestedRole === 'DOCTOR' || requestedRole === 'PATIENT' ? requestedRole : mode === 'admin' ? 'ADMIN' : 'PATIENT');
  const isAdmin = !isSignUp && loginRole === 'ADMIN';
  useEffect(() => {
    let active = true;
    currentUser().then(profile => { if (active) setUser(profile); }).catch(() => {
      if (active) setFeedback('Unable to check your session. Please try again.');
    });
    return () => { active = false; };
  }, []);

  function update(field: keyof AuthValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFeedback('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuth(mode, values);
    setErrors(nextErrors);
    const firstError = (Object.keys(nextErrors) as (keyof AuthValues)[])[0];
    if (firstError) {
      setFeedback(
        'Please check the highlighted fields. Nothing has been submitted.',
      );
      (
        form.current?.elements.namedItem(firstError) as HTMLElement | null
      )?.focus();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (!isSignUp) {
        const result = await staffLogin(loginRole, values.email, values.password);
        setUser(result.user);
        setValues(previous => ({ ...previous, password: '' }));
        let destination = safeReturnPath(new URLSearchParams(window.location.search).get('returnTo'), result.user.role) ?? result.dashboard;
        if (result.user.role === 'DOCTOR') {
          const access = await doctorAccess();
          if (access.approvedCount !== 1 || !access.profileAvailable) destination = '/doctor/application-status';
        }
        router.replace(destination);
        return;
      }
      const response = await apiRequest('/auth/register', {
        method: 'POST', refresh: false,
        body: { email: values.email, password: values.password, ...(isSignUp ? { firstName: values.firstName } : {}) },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Unable to authenticate.');
      if (!isSignUp) setUser(result.user);
      setValues(previous => ({ ...previous, password: '' }));
      setFeedback(isSignUp ? 'Account created. Please sign in.' : 'You are signed in.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to connect. Please try again.');
    } finally { setBusy(false); }
  }

  function social(provider: string) {
    // TODO: Integrate Firebase Authentication's Google / Facebook provider flow.
    // Never simulate a session or redirect to a workspace from this preview.
    setFeedback(
      `${provider} authentication is not connected yet. You are not signed in and no account has been created.`,
    );
  }

  function describedBy(field: keyof AuthValues, hint?: string) {
    return (
      [hint, errors[field] ? `${field}-error` : undefined]
        .filter(Boolean)
        .join(' ') || undefined
    );
  }

  return (
    <section className={styles.card} aria-labelledby="auth-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {isAdmin ? 'Platform administration' : 'Your care, connected'}
        </p>
        <h1 id="auth-title">{isSignUp ? titles[mode] : staffLoginOptions[loginRole].label}</h1>
      </header>
      <div className={styles.body}>
        {!isSignUp && (
          <fieldset className={styles.loginOptions} disabled={busy}>
            <legend>Choose your login</legend>
            {(['PATIENT', 'ADMIN', 'DOCTOR'] as const).map(role => (
              <label key={role}>
                <input type="radio" name="loginRole" value={role} checked={loginRole === role}
                  onChange={() => { setLoginRole(role); setErrors({}); setFeedback(''); setShowPassword(false); setValues(previous => ({ ...previous, password: '' })); }} />
                {staffLoginOptions[role].label}
              </label>
            ))}
          </fieldset>
        )}
        <p className={styles.notice}>
          {user ? 'You are signed in.' : 'Sign in securely to your account.'}
        </p>
        {user && <button type="button" onClick={async () => { try { await logout(); setUser(null); setFeedback("Signed out."); } catch { setFeedback("Unable to sign out."); } }}>Sign out</button>}
        <form
          ref={form}
          noValidate
          onSubmit={submit}
          aria-labelledby="auth-title"
          className={styles.form}
        >
          <p className={styles.note}>
            {isSignUp
              ? 'All fields except mobile number are required.'
              : 'All fields are required.'}
          </p>
          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={100}
                value={values.firstName}
                onChange={(event) => update('firstName', event.target.value)}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={describedBy('firstName')}
              />
              {errors.firstName && (
                <p id="firstName-error" className={styles.error}>
                  {errors.firstName}
                </p>
              )}
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="email">{isAdmin ? 'Admin email' : 'Email'}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email')}
            />
            {errors.email && (
              <p id="email-error" className={styles.error}>
                {errors.email}
              </p>
            )}
          </div>
          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor="phone">Mobile number (optional)</label>
              <div className={styles.phone}>
                <span aria-hidden="true">+91</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  maxLength={25}
                  value={values.phone}
                  onChange={(event) =>
                    update('phone', normalizePhone(event.target.value))
                  }
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={describedBy('phone', 'phone-hint')}
                />
              </div>
              <p id="phone-hint" className={styles.note}>
                India (+91). Enter your 10-digit mobile number. The country code
                is already included.
              </p>
              {errors.phone && (
                <p id="phone-error" className={styles.error}>
                  {errors.phone}
                </p>
              )}
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.password}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={values.password}
                onChange={(event) => update('password', event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={describedBy(
                  'password',
                  isSignUp ? 'password-hint' : undefined,
                )}
              />
              <button
                type="button"
                aria-controls="password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isSignUp && (
              <p id="password-hint" className={styles.note}>
                Use at least 8 characters.
              </p>
            )}
            {errors.password && (
              <p id="password-error" className={styles.error}>
                {errors.password}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy} className={styles.primary}>
            {busy ? 'Please waitâ€¦' : isSignUp ? 'Create account' : staffLoginOptions[loginRole].label}
          </button>
        </form>
        {isSignUp && (
          <div className={styles.alternatives}>
            <p className={styles.divider}>Or continue with</p>
            <button type="button" onClick={() => social('Google')}>
              Continue with Google
            </button>
            <button type="button" onClick={() => social('Facebook')}>
              Continue with Facebook
            </button>
          </div>
        )}
        <p
          className={styles.feedback}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {feedback}
        </p>
        {isSignUp && (
          <div className={styles.footer}>
            <p>Already have an account? <Link href="/sign-in">Sign In</Link></p>
          </div>
        )}
      </div>
    </section>
  );
}



