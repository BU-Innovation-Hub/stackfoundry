export const BOTHO_EMAIL_DOMAIN = "@bothouniversity.com";
export const BOTHO_EMAIL_ERROR = "Email must be from botho domain";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isBothoUniversityEmail = (email: string): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return EMAIL_REGEX.test(normalized) && normalized.endsWith(BOTHO_EMAIL_DOMAIN);
};
