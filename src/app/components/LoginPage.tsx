import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { login, register } from '../utils/api';

interface LoginPageProps {
  onLogin: (email: string, token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && !name) {
      setError('Please enter your name');
      return;
    }

    // Check for UC Berkeley email
    if (!email.endsWith('@berkeley.edu')) {
      setError('Please use your UC Berkeley email address');
      return;
    }

    // Password strength validation
    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      const response = isSignUp
        ? await register(email, password, name)
        : await login(email, password);
      onLogin(response.email, response.token);
    } catch (error) {
      // Parse error messages from API
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('429')) {
          setError('Too many attempts. Please try again later.');
        } else if (errorMessage.includes('409')) {
          setError('An account with this email already exists');
        } else if (errorMessage.includes('401')) {
          setError(isSignUp ? 'Invalid email or password' : 'Incorrect email or password');
        } else if (errorMessage.includes('400')) {
          setError('Invalid input. Please check your information.');
        } else {
          setError(isSignUp ? 'Could not create account. Please try again.' : 'Login failed. Please try again.');
        }
      } else {
        setError(isSignUp ? 'Could not create account. Please try again.' : 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="safe-area-screen min-h-screen bg-gradient-to-br from-[var(--color-background)] via-[var(--color-accent)] to-[var(--color-border)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl mb-4 shadow-lg">
            <span className="text-4xl">🚌</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--color-textPrimary)] mb-2">NextStop</h1>
          <p className="text-[var(--color-textMuted)]">Never miss your bus or class again</p>
        </div>

        {/* Features Highlight */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[var(--color-border)]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center">
                <span className="text-sm">🚌</span>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">Real-time bus tracking & capacity alerts</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center">
                <span className="text-sm">🎯</span>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">Smart recommendations to get to class on time</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center">
                <span className="text-sm">💰</span>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">Exclusive student discounts at local restaurants</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-[var(--color-border)]">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                !isSignUp
                  ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md'
                  : 'bg-[var(--color-accent)] text-[var(--color-textMuted)]'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                isSignUp
                  ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md'
                  : 'bg-[var(--color-accent)] text-[var(--color-textMuted)]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-textMuted)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 bg-[var(--color-background)] border-2 border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[var(--color-textPrimary)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                UC Berkeley Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-textMuted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@berkeley.edu"
                  className="w-full pl-11 pr-4 py-3 bg-[var(--color-background)] border-2 border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[var(--color-textPrimary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-textMuted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-[var(--color-background)] border-2 border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[var(--color-textPrimary)]"
                />
              </div>
              {isSignUp && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    <div className={`flex-1 h-1 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 h-1 rounded-full ${password.length >= 12 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 h-1 rounded-full ${/[!@#$%^&*]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <p className="text-xs text-[var(--color-textMuted)] mt-1">
                    {password.length < 8 ? '✓ Minimum 8 characters' : password.length >= 8 ? '✓ Good length' : ''}
                    {password.length >= 8 && !/[!@#$%^&*]/.test(password) ? ' • Add special character for strong password' : ''}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2 group"
            >
              <span>{isSignUp ? 'Create Account' : 'Log In'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button className="text-sm text-[var(--color-secondary)] hover:opacity-80 transition-opacity">
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--color-textMuted)]">
            Made for UC Berkeley students 🐻💙
          </p>
        </div>
      </div>
    </div>
  );
}
