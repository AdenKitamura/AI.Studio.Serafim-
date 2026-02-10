import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Fingerprint, Loader2, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    const redirectUrl = window.location.origin;

    console.log('Initiating Login. Redirect target:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // CRITICAL: Request access to Tasks and Calendar
        scopes: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline', // Request Refresh Token to keep connection alive
          prompt: 'consent', // Force consent screen to ensure we get the token
        },
      },
    });
    
    if (error) {
      console.error('Login Error:', error.message);
      setLoading(false);
      alert('Ошибка системы безопасности: ' + error.message);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#000000] relative overflow-hidden text-white font-mono selection:bg-emerald-500/30">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#10b98110_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full animate-in fade-in zoom-in-95 duration-1000 px-6">
        
        {/* Holographic Icon */}
        <div className="mb-12 relative group cursor-default">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-1000 animate-pulse"></div>
            <div className="w-28 h-28 rounded-[2rem] bg-zinc-900/80 backdrop-blur-xl border border-white/5 flex items-center justify-center relative shadow-2xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500">
                <Fingerprint size={56} strokeWidth={1} className="text-emerald-500/90 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
        </div>

        {/* Title */}
        <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              Serafim<span className="text-emerald-500">.</span>OS
            </h1>
            <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                   <Cpu size={10} /> Neural Core
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                   <ShieldCheck size={10} /> Encrypted
                </span>
            </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group relative w-full max-w-xs h-16 bg-white hover:bg-emerald-400 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 disabled:opacity-50 disabled:cursor-wait overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(52,211,153,0.3)] z-50"
        >
          <div className="absolute inset-0 flex items-center justify-center gap-3 transition-transform duration-500 ease-out group-hover:-translate-y-full">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 grayscale opacity-80 group-hover:grayscale-0" alt="G" />
            <span>Identify</span>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center gap-3 translate-y-full transition-transform duration-500 ease-out group-hover:translate-y-0 text-black">
             {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
             <span>{loading ? 'Connecting...' : 'Enter System'}</span>
          </div>
        </button>
        
        <p className="mt-8 text-[9px] text-zinc-600 font-medium max-w-xs text-center leading-relaxed">
          Serafim требует доступа к Google Tasks и Calendar для полной функциональности.
        </p>

      </div>

      {/* Footer */}
      <div className="py-6 relative z-10 text-center shrink-0 border-t border-white/5 bg-zinc-900/30 backdrop-blur-md">
         <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
           System Online • v4.9 Stable
        </p>
      </div>

    </div>
  );
};

export default Login;