const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]{8,128}$/;
const COMMON_PASSWORDS = new Set([
  'password',
  '12345678',
  '123456789',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'iloveyou',
  'admin',
  '1234567890',
  'password123',
  '1234567',
]);

const passwordValidationMessage =
  'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed.';

const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  const trimmed = password.trim();
  if (trimmed !== password) return false;
  if (!PASSWORD_RE.test(password)) return false;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return false;
  return true;
};

const isCommonPassword = (password) =>
  typeof password === 'string' && COMMON_PASSWORDS.has(password.toLowerCase());

module.exports = {
  EMAIL_RE,
  PASSWORD_RE,
  passwordValidationMessage,
  validatePassword,
  isCommonPassword,
};
