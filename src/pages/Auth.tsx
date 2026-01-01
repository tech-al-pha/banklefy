import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import amLogo from '@/assets/am-logo.png';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send reset email',
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reset password',
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

        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
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

        toast({
          title: 'Account created!',
          description: 'You can now start using Akromeda.',
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
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
        return 'Sign in to your account';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>
      
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-lg border-primary/20 relative z-10">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <img src={amLogo} alt="Akromeda" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            Akromeda
          </CardTitle>
          <CardDescription className="text-center">
            {getCardDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
                  <Label htmlFor="email">Email</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                )}
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Sign Up'
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
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
