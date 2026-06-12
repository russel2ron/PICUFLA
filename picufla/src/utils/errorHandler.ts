const NETWORK_ERROR_MESSAGES = [
  'Network request failed',
  'network error',
  'ERR_NETWORK',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
];

export const AUTH_ERRORS: Record<string, string> = {
  'invalid_credentials':        'Incorrect email or password.',
  'email_not_confirmed':        'Please verify your email before logging in.',
  'user_already_exists':        'An account with this email already exists.',
  'weak_password':              'Password must be at least 8 characters with uppercase, lowercase, and a number.',
  'over_email_send_rate_limit': 'Too many attempts. Please wait a few minutes.',
  'network_error':              'No internet connection. Please try again.',
  'PGRST301':                   'Session expired. Please log in again.',
  'permission_denied':          'You do not have permission to do that.',
  'service_unavailable':        'Service temporarily unavailable. Try again shortly.',
};

function isNetworkError(error: Error): boolean {
  return NETWORK_ERROR_MESSAGES.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return AUTH_ERRORS['network_error'];
    }
    const code = (error as any)?.code ?? (error as any)?.status ?? '';
    return AUTH_ERRORS[code] ?? AUTH_ERRORS[error.message] ?? (error.message || 'Something went wrong. Please try again.');
  }
  return 'Something went wrong. Please try again.';
}
