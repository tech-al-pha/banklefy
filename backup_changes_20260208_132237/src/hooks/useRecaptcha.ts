import { useCallback, useEffect, useState } from 'react';

type Grecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

// reCAPTCHA v3 site key - runs invisibly in background
const RECAPTCHA_SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ??
  '6LddTDssAAAAAIZSSRGVJTOq__hjo4AiGAxC0x_U';

let recaptchaLoadPromise: Promise<void> | null = null;

const ensureRecaptchaLoaded = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('reCAPTCHA can only load in a browser environment');
  }

  if (window.grecaptcha) {
    await new Promise<void>((resolve) => window.grecaptcha!.ready(resolve));
    return;
  }

  if (recaptchaLoadPromise) {
    return recaptchaLoadPromise;
  }

  recaptchaLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript =
      document.querySelector<HTMLScriptElement>('script[data-recaptcha-v3="true"]') ??
      document.querySelector<HTMLScriptElement>('script[src*="www.google.com/recaptcha/api.js"]') ??
      document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js"]');

    const script = existingScript ?? document.createElement('script');

    const startedAt = Date.now();
    const timeoutMs = 15000;

    const cleanup = () => {
      window.clearInterval(pollId);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    const onLoad = () => {
      if (!window.grecaptcha) {
        return;
      }
      window.grecaptcha.ready(() => {
        cleanup();
        resolve();
      });
    };

    // Handle cases where a script tag already exists and we might miss its `load` event.
    const pollId = window.setInterval(() => {
      if (window.grecaptcha) {
        onLoad();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        onError();
      }
    }, 50);

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    if (!existingScript) {
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      script.dataset.recaptchaV3 = 'true';
      document.head.appendChild(script);
    }
  }).catch((err) => {
    recaptchaLoadPromise = null;
    throw err;
  });

  return recaptchaLoadPromise;
};

export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    ensureRecaptchaLoaded()
      .then(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.error('reCAPTCHA failed to load:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Execute reCAPTCHA v3 and get token - call this right before form submission
  const executeRecaptcha = useCallback(async (action: string = 'convert'): Promise<string | null> => {
    try {
      await ensureRecaptchaLoaded();
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      return null;
    }
  }, []);

  return {
    isLoaded,
    executeRecaptcha,
    siteKey: RECAPTCHA_SITE_KEY,
  };
};
