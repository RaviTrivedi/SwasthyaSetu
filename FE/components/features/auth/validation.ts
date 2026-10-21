export type AuthMode = 'sign-up' | 'sign-in' | 'admin';
export type AuthValues = {
  firstName: string;
  email: string;
  phone: string;
  password: string;
};
export type AuthErrors = Partial<Record<keyof AuthValues, string>>;

export function normalizePhone(value: string) {
  return value
    .replace(/[\s()-]/g, '')
    .replace(/^(?:\+91|0091|91)(?=\d{10}$)/, '');
}

export function validateAuth(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'sign-up' && !values.firstName.trim())
    errors.firstName = 'Enter your first name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter a valid email address.';
  if (
    mode === 'sign-up' &&
    values.phone.trim() &&
    !/^[6-9]\d{9}$/.test(normalizePhone(values.phone))
  )
    errors.phone =
      'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9, or leave this field blank.';
  if (!values.password) errors.password = 'Enter your password.';
  else if (mode === 'sign-up' && values.password.length < 8)
    errors.password = 'Use at least 8 characters for your password.';
  return errors;
}
