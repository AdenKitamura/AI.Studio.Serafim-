import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Sparkles, ArrowRight, Mail, Loader2, ShieldCheck, Cpu } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Магическая ссылка отправлена на почту!', type: 'success' });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) console.error('Error logging in with Google:', error.message);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-indigo-900/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="glass-card rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Cpu size={40} className="text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
              Serafim OS<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-white/40 text-sm font-medium">
              Вход в защищенный терминал
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Войти через Google
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/20 text-[10px] uppercase font-black tracking-widest">Или Email</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 outline-none focus:border-emerald-500/50 transition-all font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Отправить ссылку <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Feedback Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 text-xs font-bold uppercase tracking-wide animate-in slide-in-from-bottom-2 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {message.type === 'success' ? <Sparkles size={16} /> : <ShieldCheck size={16} />}
              {message.text}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">
              Secured by Supabase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;