import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import banklefyLogo from '@/assets/banklefy-logo.svg';
import { useLanguage } from '@/contexts/LanguageContext';
import AutoHideHeader from "@/components/AutoHideHeader";

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';
type SocialProviderId = 'google' | 'apple' | 'facebook' | 'linkedin' | 'instagram';

// Key for storing remembered email
const REMEMBERED_EMAIL_KEY = 'banklefy_remembered_email';

function SocialIcon({ provider }: { provider: SocialProviderId }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current">
        <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
        <path d="M12 7.25a4.75 4.75 0 0 1 3.5 1.45" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.4 9.1A4.75 4.75 0 0 0 7.25 12c0 2.62 2.13 4.75 4.75 4.75 2.14 0 3.98-1.42 4.56-3.38H12" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (provider === 'apple') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M15.5 12.3c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.6-.8-1.3 0-2.6.8-3.2 1.9-1.4 2.3-.3 5.8 1 7.6.7.9 1.4 1.9 2.5 1.8 1-.1 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-.9 2.4-1.8.8-1 1.1-2 1.1-2.1-.1 0-2.1-.8-2.1-2.6ZM13.5 6.2c.5-.6.9-1.5.8-2.3-.8 0-1.7.5-2.3 1.1-.5.5-.9 1.4-.8 2.2.9.1 1.8-.4 2.3-1Z" />
      </svg>
    );
  }

  if (provider === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M13.4 20v-7h2.4l.4-2.8h-2.8V8.5c0-.8.2-1.4 1.4-1.4h1.5V4.6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.9H8v2.8h2.4v7h3Z" />
      </svg>
    );
  }

  if (provider === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M6.3 8.2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm-1.2 2h2.5V18H5.1v-7.8Zm4.1 0h2.4v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.5 0 3 1.65 3 3.8V18h-2.5v-3.7c0-.88-.02-2-.1-2-.1 0-.3.16-.4.33-.22.34-.35.83-.35 1.37V18H9.2v-7.8Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current">
      <rect x="4.25" y="4.25" width="15.5" height="15.5" rx="4.2" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.25" strokeWidth="1.7" />
      <circle cx="17.3" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Auth() {
  const { t } = useLanguage();
  
  // Check if user has visited before (returning user)
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  const isReturningUser = !!rememberedEmail;
  
  const [mode, setMode] = useState<AuthMode>(isReturningUser ? 'login' : 'signup');
  const [email, setEmail] = useState(rememberedEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
  };
  const socialProviders: Array<{
    id: SocialProviderId;
    label: string;
    status: 'live' | 'setup';
  }> = [
    { id: 'google', label: 'Google', status: 'live' },
    { id: 'apple', label: 'Apple', status: 'setup' },
    { id: 'facebook', label: 'Facebook', status: 'setup' },
    { id: 'linkedin', label: 'LinkedIn', status: 'setup' },
    { id: 'instagram', label: 'Instagram', status: 'setup' },
  ];

  // Check for password reset mode from URL and handle recovery session
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
      setLoading(true);
      
      // Listen for the PASSWORD_RECOVERY event to establish the session
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setRecoverySessionReady(true);
          setLoading(false);
        }
      });

      // Also check if session already exists (in case event already fired)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setRecoverySessionReady(true);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== 'reset' && !awaitingVerification) {
      navigate('/');
    }
  }, [user, navigate, mode, awaitingVerification]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
      });
      setMode('login');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'Failed to send reset email'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recoverySessionReady) {
      toast({
        variant: 'destructive',
        title: 'Session not ready',
        description: 'Please wait for the recovery session to be established or try clicking the link in your email again.',
      });
      return;
    }
    
    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
        return;
      }
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully reset.',
      });
      navigate('/');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'Failed to reset password'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Invalid email or password',
            });
          } else {
            throw error;
          }
          return;
        }

        // Remember this email for next time
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        setAwaitingVerification(false);

        toast({
          title: t('auth.welcome'),
          description: t('auth.signedIn'),
        });
        navigate('/');
        } else {
          // require terms acceptance on signup
          if (!termsAccepted) {
            toast({
              variant: 'destructive',
              title: 'Please accept Terms',
              description: 'You must accept the Terms & Conditions to create an account.',
            });
            setLoading(false);
            return;
          }

          const { error, data } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (error) {
            if (error.message.includes('already registered')) {
              toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: 'An account with this email already exists',
              });
            } else {
              throw error;
            }
            return;
          }

          // Remember this email for next time
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());

          if (data?.session) {
            // Try to persist consent flag if possible (only when session exists)
            try {
              await supabase.auth.updateUser({ data: { terms_accepted: 'true' } });
            } catch {
              // ignore errors - not critical
            }

            toast({
              title: t('auth.accountCreated'),
              description: t('auth.canUse'),
            });
            setAwaitingVerification(false);
            navigate('/');
          } else {
            toast({
              title: 'Verify your email',
              description: 'We sent a verification link. Please verify and then sign in.',
            });
            setAwaitingVerification(true);
            setMode('login');
            setPassword('');
            setConfirmPassword('');
          }
        }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'An unexpected error occurred'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/?next=demo`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Google sign-in failed',
        description: getErrorMessage(error, 'Unable to start Google sign-in'),
      });
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: SocialProviderId) => {
    if (provider === 'google') {
      await handleGoogleAuth();
      return;
    }

    toast({
      title: `${socialProviders.find((item) => item.id === provider)?.label || provider} setup pending`,
      description: 'Frontend ready hai. Ab Supabase dashboard aur provider app credentials connect karne honge.',
    });
  };

  const getCardDescription = () => {
    switch (mode) {
      case 'forgot':
        return 'Enter your email to receive a reset link';
      case 'reset':
        return 'Enter your new password';
      case 'signup':
        return 'Create a new account';
      default:
        return isReturningUser ? `Welcome back! Sign in as ${rememberedEmail}` : 'Sign in to your account';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-24 relative overflow-hidden">
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex items-center justify-start">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="back-pill"
          >
            <ArrowLeft size={18} /> {t('common.backToHome')}
          </Button>
        </div>
      </AutoHideHeader>

      <div className="relative z-10 w-full max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(420px,0.92fr)_minmax(0,1.05fr)] lg:items-start">
          <aside className="order-2 py-6 pr-1 lg:order-1 lg:pr-4 lg:pt-24 lg:pb-8">
            <div className="mb-6 text-center lg:mb-8">
              <h2 className="text-xl font-semibold tracking-[0.04em] text-[#e8d8bf] md:text-2xl">
                Continue your way
              </h2>
              <p className="mt-2 text-sm text-[#cdbb9d]/78 md:text-[15px]">
                Pick the sign-in provider that feels quickest and most familiar for you.
              </p>
            </div>
            <div className="space-y-5">
              {socialProviders.map((provider) => {
                return (
                  <Button
                    key={provider.id}
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialAuth(provider.id)}
                    className="h-12 w-full rounded-[1.25rem] border border-white/10 bg-[#171717] px-5 text-[#e8d8bf] hover:bg-[#1c1c1c] md:h-[3.15rem]"
                    disabled={loading}
                  >
                    <span className="flex w-full items-center justify-center">
                      <span className="flex w-full max-w-[20rem] items-center gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] text-white">
                          <span className="scale-[1.34]">
                            <SocialIcon provider={provider.id} />
                          </span>
                        </span>
                        <span className="text-left text-base font-medium leading-none">
                          Continue with {provider.label}
                        </span>
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </aside>

          <div className="order-1 space-y-10 lg:order-2">
            <section className="px-2 py-2 text-center md:px-6">
              <div className="mb-3 flex justify-center">
                <img src={banklefyLogo} alt="Banklefy" className="h-16 w-16 object-contain md:h-20 md:w-20 lg:h-24 lg:w-24" />
              </div>
              <div className="text-center text-xs uppercase tracking-[0.35em] text-muted-foreground">
                {t('auth.secureAccess')}
              </div>
              <CardTitle className="font-noir mt-3 text-center text-[1.45rem] font-black uppercase tracking-[0.04em] bg-gradient-to-r from-[#FFFFFF] via-[#B5B5B5] to-[#717171] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] md:text-[1.8rem] lg:text-[2.1rem]">
                Banklefy
              </CardTitle>
              <CardDescription className="mt-4 text-center text-sm text-muted-foreground/90 md:text-base">
                {getCardDescription()}
              </CardDescription>
            </section>

            <section className="px-2 pb-1 md:px-6 md:pt-1">
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4" autoComplete="on">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full glass-premium border border-primary/30 text-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-glow-link no-hover-glow w-full justify-center text-sm text-primary"
                disabled={loading}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to login
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {loading && !recoverySessionReady ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Establishing secure session...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full glass-premium border border-primary/30 text-foreground"
                    disabled={loading || !recoverySessionReady}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </>
              )}
            </form>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                  {isReturningUser && mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                        setEmail('');
                        setMode('signup');
                      }}
                      className="text-glow-link no-hover-glow text-xs"
                    >
                      Not you? Use a different account
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                      autoComplete={mode === 'login' ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  )}
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-glow-link no-hover-glow text-sm text-muted-foreground"
                    disabled={loading}
                  >
                    {t('auth.forgotPassword')}
                  </button>
                )}
                {mode === 'signup' && (
                  <div className="flex items-start gap-2">
                    <input
                      id="termsAccepted"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      disabled={loading}
                      className="mt-1 h-4 w-4 text-primary rounded border-muted-foreground"
                    />
                    <label htmlFor="termsAccepted" className="text-sm text-muted-foreground">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/terms')}
                        className="text-glow-link no-hover-glow text-primary"
                        disabled={loading}
                      >
                        Terms &amp; Conditions
                      </button>
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full glass-premium border border-primary/30 text-foreground ${loading || (mode === 'signup' && !termsAccepted) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={loading || (mode === 'signup' && !termsAccepted)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    mode === 'login' ? t('auth.signIn') : t('auth.signUp')
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-glow-link no-hover-glow text-primary"
                  disabled={loading}
                >
                  {mode === 'login'
                    ? t('auth.noAccount')
                    : t('auth.hasAccount')}
                </button>
              </div>
            </>
          )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
