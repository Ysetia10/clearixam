// Production-safe error logging utility
interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class ErrorLogger {
  private isDevelopment = import.meta.env.DEV;

  log(error: Error, context?: ErrorContext) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context,
    };

    // Only log to console in development
    if (this.isDevelopment) {
      console.error('Error logged:', errorInfo);
    }

    // Store in sessionStorage for debugging (limit to 10 errors)
    try {
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push(errorInfo);
      if (errors.length > 10) {
        errors.shift();
      }
      sessionStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      // Silently fail if storage is full
    }

    // In production, this would send to a monitoring service
    // Example: Sentry.captureException(error, { extra: context });
  }

  logApiError(error: any, endpoint: string) {
    const apiError = new Error(`API Error: ${endpoint}`);
    this.log(apiError, {
      endpoint,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
  }

  logComponentError(error: Error, componentName: string) {
    this.log(error, {
      component: componentName,
      type: 'component_error',
    });
  }

  getRecentErrors(): any[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_errors') || '[]');
    } catch {
      return [];
    }
  }

  clearErrors() {
    sessionStorage.removeItem('app_errors');
  }
}

export const errorLogger = new ErrorLogger();
