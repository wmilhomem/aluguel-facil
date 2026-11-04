const PENDING_EMAIL_KEY = 'aluguel_facil_pending_email';

export function getPendingEmail(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PENDING_EMAIL_KEY) || '';
}

export function setPendingEmail(email: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_EMAIL_KEY, email);
}

export function clearPendingEmail(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_EMAIL_KEY);
}
