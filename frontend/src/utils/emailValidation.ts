export const BOTHO_EMAIL_DOMAIN = "@bothouniversity.com";
export const BOTHO_EMAIL_ERROR = "Email must be from botho domain";

export const isBothoUniversityEmail = (email: string): boolean =>
  email.trim().toLowerCase().endsWith(BOTHO_EMAIL_DOMAIN);
