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
import akromedaLogo from '@/assets/akromeda-logo.svg';
import { useLanguage } from '@/contexts/LanguageContext';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

// Key for storing remembered email
const REMEMBERED_EMAIL_KEY = 'akromeda_remembered_email';

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
  };

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
    if (user && mode !== 'reset') {
      navigate('/');
    }
  }, [user, navigate, mode]);

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

          // Try to persist consent flag if possible
          try {
            // If user is signed in immediately, update user metadata
            await supabase.auth.updateUser({ data: { terms_accepted: 'true' } });
          } catch (e) {
            // ignore errors - not critical
          }

          // Remember this email for next time
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());

          toast({
            title: t('auth.accountCreated'),
            description: t('auth.canUse'),
          });
          navigate('/');
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-muted-foreground transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>
      
      <div className="w-full max-w-md relative z-10">
        <div className="space-y-2 pt-2">
          <div className="flex justify-center mb-3">
            <img src={akromedaLogo} alt="Akromeda" className="h-20 w-20 md:h-24 md:w-24 object-contain" />
          </div>
          <div className="text-center text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Secure Access
          </div>
          <CardTitle className="text-center text-[1.65rem] md:text-[2.1rem] font-extrabold uppercase tracking-[0.09em] bg-gradient-to-r from-[#FFFFFF] via-[#B5B5B5] to-[#717171] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
            Akromeda
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/90">
            {getCardDescription()}
          </CardDescription>
        </div>
        <div className="pb-8 pt-6">
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
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
                className="flex items-center justify-center w-full text-sm text-primary hover:underline"
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
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-background/50 pr-10"
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
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-background/50 pr-10"
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background/50"
                  />
                  {isReturningUser && mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                        setEmail('');
                        setMode('signup');
                      }}
                      className="text-xs text-muted-foreground hover:underline"
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
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-background/50 pr-10"
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
                    className="text-sm text-muted-foreground hover:underline"
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
                        className="text-primary hover:underline"
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
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  {mode === 'login'
                    ? t('auth.noAccount')
                    : t('auth.hasAccount')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
