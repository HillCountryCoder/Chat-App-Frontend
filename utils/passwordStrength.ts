export const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[\W_]/.test(password)) strength++;

  return strength; // A score from 0 to 5
};
