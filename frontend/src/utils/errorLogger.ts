// Minimal error logging utility
// Can be extended to integrate with Sentry, LogRocket, or other monitoring services

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

    // In development, log to console
    if (this.isDevelopment) {
      console.error('Error logged:', errorInfo);
    }

    // In production, this would send to a monitoring service
    // Example: Sentry.captureException(error, { extra: context });
    
    // For now, store in sessionStorage for debugging
    try {
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push(errorInfo);
      // Keep only last 10 errors
      if (errors.length > 10) {
        errors.shift();
      }
      sessionStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      // Silently fail if storage is full
    }
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
