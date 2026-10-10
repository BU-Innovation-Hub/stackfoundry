export const BOTHO_EMAIL_ERROR = "Email must use @bothouniversity.com or @bothouniversity.ac.bw";

const EMAIL_REGEX = /^[A-Z0-9]+(?:[._%+-][A-Z0-9]+)*@(?:bothouniversity\.com|bothouniversity\.ac\.bw)$/i;

export const isBothoUniversityEmail = (email: string): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return EMAIL_REGEX.test(normalized);
};
