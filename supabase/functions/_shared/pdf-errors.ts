type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  reason?: unknown;
  cause?: unknown;
};

const collectErrorText = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (!error || typeof error !== 'object') {
    return String(error ?? '');
  }

  const value = error as ErrorLike;
  const parts = [value.name, value.message, value.code, value.reason, value.cause]
    .filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
    .map((part) => String(part));

  return parts.join(' ');
};

export const isPdfPasswordError = (error: unknown): boolean => {
  const text = collectErrorText(error).toLowerCase();
  if (!text) return false;

  return (
    text.includes('passexception') ||
    text.includes('passwordexception') ||
    text.includes('password required') ||
    text.includes('password-protected') ||
    text.includes('password protected') ||
    text.includes('incorrect password') ||
    text.includes('invalid password') ||
    text.includes('wrong password') ||
    text.includes('need a password') ||
    text.includes('encrypted') ||
    text.includes('decryption') ||
    text.includes('bad decrypt')
  );
};
