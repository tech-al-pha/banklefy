import { useState, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
        theme?: 'light' | 'dark';
        size?: 'compact' | 'normal';
      }) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

const RECAPTCHA_SITE_KEY = '6LcvMlQrAAAAAPdD4_DzQGYPszzgO6-ybNNwB2z2';

export const useRecaptcha = () => {
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (window.grecaptcha) {
      setIsLoaded(true);
      return;
    }

    // Set up callback
    window.onRecaptchaLoad = () => {
      setIsLoaded(true);
    };

    // Load the script if not present
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      window.onRecaptchaLoad = undefined;
    };
  }, []);

  const renderRecaptcha = useCallback((containerId: string) => {
    if (!isLoaded || !window.grecaptcha) return;

    window.grecaptcha.ready(() => {
      // Don't render if already rendered
      if (widgetId !== null) return;
      
      const container = document.getElementById(containerId);
      if (!container || container.hasChildNodes()) return;

      try {
        const id = window.grecaptcha.render(containerId, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => {
            setRecaptchaToken(token);
          },
          'expired-callback': () => {
            setRecaptchaToken(null);
          },
          'error-callback': () => {
            setRecaptchaToken(null);
          },
          theme: 'dark',
          size: 'normal',
        });
        setWidgetId(id);
      } catch (e) {
        // Widget might already be rendered
        console.warn('reCAPTCHA render warning:', e);
      }
    });
  }, [isLoaded, widgetId]);

  const resetRecaptcha = useCallback(() => {
    if (window.grecaptcha && widgetId !== null) {
      window.grecaptcha.reset(widgetId);
    }
    setRecaptchaToken(null);
  }, [widgetId]);

  return {
    recaptchaToken,
    isLoaded,
    renderRecaptcha,
    resetRecaptcha,
    siteKey: RECAPTCHA_SITE_KEY,
  };
};
