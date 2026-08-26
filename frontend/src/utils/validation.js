export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]{8,128}$/;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const validateEmail = (value) => EMAIL_RE.test(normalizeEmail(value));

export const passwordRules = [
  {
    key: 'length',
    label: '8-128 characters',
    test: (value) => value.length >= 8 && value.length <= 128,
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    key: 'number',
    label: 'At least one number',
    test: (value) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'At least one special character',
    test: (value) => /[^A-Za-z\d\s]/.test(value),
  },
  {
    key: 'noSpaces',
    label: 'No spaces allowed',
    test: (value) => !/\s/.test(value),
  },
];

export const isPasswordValid = (value) => PASSWORD_RE.test(value);

export const getPasswordStrength = (value) => {
  const score = passwordRules.reduce((sum, rule) => sum + (rule.test(value) ? 1 : 0), 0);
  const percent = Math.round((score / passwordRules.length) * 100);
  const label = score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : 'Strong';
  return { score, label, percent };
};
