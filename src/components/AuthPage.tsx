import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot_password' | 'update_password';

export const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we arrived here with a recovery token (hash contains type=recovery)
    if (window.location.hash.includes('type=recovery')) {
      setAuthMode('update_password');
    }

    // Subscribe to auth events for password recovery
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      navigate('/');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email belum terdaftar atau kata sandi salah.');
          }
          throw error;
        }
        navigate('/');
      } else if (authMode === 'register') {
        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Akun dengan email ini telah terdaftar. Silakan login.');
          }
          throw error;
        }
        
        // Supabase returns a user but session is null if email confirmation is required
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Akun dengan email ini telah terdaftar. Silakan login.');
        } else {
          setSuccessMsg('Pendaftaran berhasil! Silakan periksa kotak masuk email Anda untuk verifikasi.');
          setAuthMode('login');
          setPassword('');
        }
      } else if (authMode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth'
        });
        if (error) throw error;
        
        setSuccessMsg('Tautan untuk mengatur ulang kata sandi telah dikirim ke email Anda.');
        setAuthMode('login');
      } else if (authMode === 'update_password') {
        const { error } = await supabase.auth.updateUser({ password: password });
        if (error) throw error;
        
        setSuccessMsg('Kata sandi berhasil diperbarui! Silakan login dengan kata sandi baru Anda.');
        setAuthMode('login');
        setPassword('');
        // Clear hash so it doesn't trigger recovery again on refresh
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'login': return 'Welcome back';
      case 'register': return 'Create an account';
      case 'forgot_password': return 'Reset Password';
      case 'update_password': return 'Set New Password';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'login': 
        return (
          <>
            Don't have an account?{' '}
            <button onClick={() => setAuthMode('register')} className="font-medium text-orange-600 hover:text-orange-500 transition-colors">Sign up</button>
          </>
        );
      case 'register':
        return (
          <>
            Already have an account?{' '}
            <button onClick={() => setAuthMode('login')} className="font-medium text-orange-600 hover:text-orange-500 transition-colors">Log in</button>
          </>
        );
      case 'forgot_password':
        return 'Enter your email to receive a reset link.';
      case 'update_password':
        return 'Enter your new strong password below.';
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Decorative/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {/* Abstract gradients and background image */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-slate-900/80 to-slate-900 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070&auto=format&fit=crop')" }}
        />
        
        {/* Content */}
        <div className="relative z-20 text-center px-12 max-w-lg">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20 shadow-2xl">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 tracking-tight leading-tight">
            Dive into your next great adventure.
          </h1>
          <p className="text-lg text-slate-300 font-light leading-relaxed">
            InsBook provides a seamless, distraction-free reading experience for all your favorite PDF books.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        {(authMode === 'forgot_password' || authMode === 'register') && (
          <button 
            onClick={() => setAuthMode('login')}
            className="absolute left-4 top-4 sm:left-8 sm:top-8 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full transition-all duration-200"
            title="Back to login"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10 lg:mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {getTitle()}
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {getSubtitle()}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50/50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50/50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                {successMsg}
              </div>
            )}
            
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 sm:text-sm transition-all duration-200 bg-slate-50/50 focus:bg-white"
                  placeholder="John Doe"
                />
              </div>
            )}

            {authMode !== 'update_password' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 sm:text-sm transition-all duration-200 bg-slate-50/50 focus:bg-white"
                  placeholder="you@example.com"
                />
              </div>
            )}

            {authMode !== 'forgot_password' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    {authMode === 'update_password' ? 'New Password' : 'Password'}
                  </label>
                  {authMode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('forgot_password')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 sm:text-sm pr-12 transition-all duration-200 bg-slate-50/50 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:opacity-70 transition-all duration-200"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  authMode === 'login' ? 'Sign in' : 
                  authMode === 'register' ? 'Register' : 
                  authMode === 'forgot_password' ? 'Send Reset Link' : 
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
