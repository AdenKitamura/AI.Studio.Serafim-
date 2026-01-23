import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Fingerprint, Loader2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect back to the app root, App.tsx handles the view
        redirectTo: window.location.origin, 
      },
    });
    if (error) {
      console.error('Login Error:', error.message);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#000000] relative overflow-hidden text-white font-mono">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#000000] to-[#000000] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        
        {/* Icon */}
        <div className="mb-12 relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center relative shadow-2xl">
                <Fingerprint size={48} strokeWidth={1} className="text-white/80" />
            </div>
        </div>

        {/* Title */}
        <div className="text-center mb-16 space-y-3">
            <h1 className="text-3xl font-black tracking-[0.2em] uppercase">
              Serafim<span className="text-emerald-500">.</span>OS
            </h1>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
            </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group relative w-72 h-16 bg-white hover:bg-emerald-400 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(52,211,153,0.4)]"
        >
          <div className="absolute inset-0 flex items-center justify-center gap-3 transition-transform duration-300 group-hover:-translate-y-full">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 grayscale opacity-80" alt="G" />
            <span>Identify Via Google</span>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center gap-3 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
             {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
             <span>{loading ? 'Authorizing...' : 'Access Terminal'}</span>
          </div>
        </button>

        {/* Footer info */}
        <p className="fixed bottom-8 text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
           Secure Environment • v4.2 Pro
        </p>

      </div>
    </div>
  );
};

export default Login;