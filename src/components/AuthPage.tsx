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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-sm border border-slate-200 sm:rounded-3xl sm:px-12 relative overflow-hidden">
          
          {(authMode === 'forgot_password' || authMode === 'register') && (
            <button 
              onClick={() => setAuthMode('login')}
              className="absolute left-4 top-4 sm:left-6 sm:top-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-all duration-200"
              title="Back to login"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="mb-10 mt-4 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {getTitle()}
            </h2>
            <p className="mt-3 text-sm text-slate-500 font-medium">
              {getSubtitle()}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMsg}
              </div>
            )}
            
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {authMode !== 'update_password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {authMode !== 'forgot_password' && (
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    {authMode === 'update_password' ? 'New Password' : 'Password'}
                  </label>
                  {authMode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('forgot_password')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-500"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 transition-colors"
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
