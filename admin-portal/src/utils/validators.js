/** Email validation */
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Phone validation (US) */
export const isValidPhone = (phone) => /^\+?1?\d{10,11}$/.test(phone?.replace(/\D/g, ''));

/** Password strength (min 8 chars, upper, lower, number, special) */
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Empty', color: 'gray' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { min: 0, label: 'Very Weak', color: 'urgent' },
    { min: 2, label: 'Weak', color: 'urgent' },
    { min: 3, label: 'Fair', color: 'warning' },
    { min: 4, label: 'Good', color: 'primary' },
    { min: 5, label: 'Strong', color: 'success' },
  ];
  const level = [...levels].reverse().find((l) => score >= l.min);
  return { score, label: level.label, color: level.color };
};

/** Required field validator */
export const required = (value) => (value && String(value).trim() ? '' : 'This field is required');

/** Min length validator */
export const minLength = (min) => (value) =>
  value && value.length >= min ? '' : `Must be at least ${min} characters`;

/** Form validator — runs all rules, returns errors object */
export const validateForm = (values, rules) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const error = rule(values[field], values);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return errors;
};
