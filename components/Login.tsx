import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Fingerprint, Loader2 } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Login Error:', error.message);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative z-10 w-full max-w-sm px-6 animate-in zoom-in-95 duration-500">
        
        {/* Logo/Icon */}
        <div className="flex flex-col items-center justify-center mb-12">
            <div className="w-20 h-20 rounded-[2rem] border border-white/10 bg-white/5 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                <Fingerprint size={40} className="text-white opacity-80" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase text-center">
              Serafim<span className="text-emerald-500">.</span>OS
            </h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">
              Secure Terminal Access
            </p>
        </div>

        {/* Main Action */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group w-full py-5 bg-white hover:bg-emerald-400 text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Авторизация...
            </>
          ) : (
            <>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="G" />
              Identify Via Google
            </>
          )}
        </button>

        {/* Footer */}
        <div className="mt-8 text-center">
           <p className="text-[9px] text-white/10 font-mono uppercase">
             System v4.2 • Protected by Supabase Auth
           </p>
        </div>

      </div>
    </div>
  );
};

export default Login;