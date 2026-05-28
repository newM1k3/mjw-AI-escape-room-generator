import { useEffect, useRef, useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { publicConfig } from '../config';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onNavigateLegal?: (page: 'terms' | 'privacy') => void;
}

type AuthMode = 'login' | 'register' | 'reset';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function AuthModal({ onClose, initialMode = 'login', onNavigateLegal }: AuthModalProps) {
  const { login, register, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const titleId = 'auth-dialog-title';
  const subtitleId = 'auth-dialog-description';
  const nameId = 'auth-full-name';
  const emailId = 'auth-email';
  const passwordId = 'auth-password';
  const errorId = 'auth-error';
  const successId = 'auth-success';

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return 'Enter your email address.';
    if (!isValidEmail(trimmedEmail)) return 'Enter a valid email address, such as you@example.com.';

    if (mode === 'reset') return '';

    if (mode === 'register' && !name.trim()) return 'Enter your full name.';
    if (!password) return 'Enter your password.';
    if (mode === 'register' && password.length < 8) return 'Use a password with at least 8 characters.';

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password, name);
        onClose();
      } else {
        await requestPasswordReset(email);
        setSuccess(`If PocketBase email delivery is configured, a password reset link will be sent to ${email.trim()}. If you do not receive it, contact ${publicConfig.supportEmail}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetFeedback();
    setShowPassword(false);
  };

  const title = mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password';
  const subtitle = mode === 'login'
    ? 'Welcome back to PuzzleFlow AI'
    : mode === 'register'
      ? 'Start generating for free'
      : 'Send a reset link through PocketBase email';

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modalElement = modalRef.current;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !modalElement) return;

      const focusableElements = Array.from(
        modalElement.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('aria-hidden'));

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative z-10 w-full max-w-md mx-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-white">{title}</h2>
              <p id={subtitleId} className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
              aria-label="Close authentication dialog"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor={nameId} className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id={nameId}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    autoComplete="name"
                    aria-invalid={Boolean(error) && mode === 'register' && !name.trim()}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor={emailId} className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(error) && (!email.trim() || !isValidEmail(email))}
                  aria-describedby={error ? errorId : success ? successId : undefined}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={passwordId} className="block text-sm font-medium text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    aria-invalid={Boolean(error) && !password}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div id={errorId} className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5" role="alert">
                <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div id={successId} className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5" role="status">
                <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {isLoading
                ? mode === 'login'
                  ? 'Signing in...'
                  : mode === 'register'
                    ? 'Creating account...'
                    : 'Sending reset link...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
            </button>
          </form>

          <div className="px-6 pb-6 text-center space-y-3">
            {mode === 'reset' ? (
              <p className="text-sm text-slate-400">
                Remembered your password?{' '}
                <button onClick={() => switchMode('login')} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Back to Sign In
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Need help? Contact{' '}
              <a href={`mailto:${publicConfig.supportEmail}`} className="text-cyan-400 hover:text-cyan-300">
                {publicConfig.supportEmail}
              </a>
              . By continuing, you agree to the{' '}
              <button type="button" onClick={() => onNavigateLegal?.('terms')} className="text-slate-300 hover:text-white underline underline-offset-2">
                Terms of Use
              </button>{' '}
              and{' '}
              <button type="button" onClick={() => onNavigateLegal?.('privacy')} className="text-slate-300 hover:text-white underline underline-offset-2">
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
