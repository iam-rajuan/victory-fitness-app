import { ApiError } from './api';

export type AppErrorDetails = {
  title: string;
  message: string;
};

function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

function containsAny(message: string, needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function formatValidationError(message: string): AppErrorDetails {
  if (containsAny(message, ['email address', 'body","email', "body','email"])) {
    return {
      title: 'Check your email',
      message: 'Enter a valid email address, such as name@example.com.',
    };
  }

  if (containsAny(message, ['password'])) {
    return {
      title: 'Check your password',
      message: 'Please check the password requirements and try again.',
    };
  }

  return {
    title: 'Check your information',
    message: 'Some information is missing or invalid. Review the highlighted fields and try again.',
  };
}

export function formatAppError(error: unknown, fallbackMessage = 'Please try again.'): AppErrorDetails {
  const rawMessage =
    error instanceof ApiError
      ? error.detail || error.message
      : error instanceof Error
        ? error.message
        : '';

  const message = normalizeMessage(rawMessage || fallbackMessage);
  const lower = message.toLowerCase();

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: 'Authentication Error',
        message: containsAny(lower, ['session']) ? 'Your session expired. Please log in again.' : message,
      };
    }

    if (error.status === 403 && containsAny(lower, ['verify', 'verification'])) {
      return {
        title: 'Verification Error',
        message,
      };
    }

    if (error.status === 409) {
      return {
        title: 'Account Error',
        message,
      };
    }

    if (error.status === 422) {
      return formatValidationError(message);
    }

    if (error.status === 503 || containsAny(lower, ['mongodb', 'database', 'atlas'])) {
      return {
        title: 'Database Error',
        message,
      };
    }

    if (error.status >= 500) {
      return {
        title: 'Server Error',
        message,
      };
    }
  }

  if (containsAny(lower, ['openai_api_key', 'anthropic_api_key', 'api key', 'model is not configured'])) {
    return {
      title: 'API Key Error',
      message,
    };
  }

  if (containsAny(lower, ['verification', 'verify email', 'code expired', 'invalid verification code'])) {
    return {
      title: 'Verification Error',
      message,
    };
  }

  if (containsAny(lower, ['mongodb', 'database', 'atlas'])) {
    return {
      title: 'Database Error',
      message,
    };
  }

  if (containsAny(lower, ['invalid email or password', 'email is already registered', 'email is not verified'])) {
    return {
      title: 'Authentication Error',
      message,
    };
  }

  return {
    title: 'Error',
    message,
  };
}
