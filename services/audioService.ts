
export const playAlarmSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    // Resume context if suspended (browser policy)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        // Attack
        gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.1);
        // Decay
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        oscillator.start(ctx.currentTime + start);
        oscillator.stop(ctx.currentTime + start + duration);
    };

    // Melodic Alarm Sequence (Futuristic)
    // E5, B4, G4, E4 sequence repeated
    const now = 0;
    playNote(659.25, now, 0.4, 'triangle'); // E5
    playNote(493.88, now + 0.2, 0.4, 'sine'); // B4
    playNote(392.00, now + 0.4, 0.4, 'sine'); // G4
    playNote(329.63, now + 0.6, 0.8, 'triangle'); // E4

    // Repeat after short delay for urgency
    playNote(659.25, now + 1.0, 0.4, 'triangle'); 
    playNote(880.00, now + 1.2, 0.6, 'sine'); 

  } catch (e) {
    console.error("Audio engine failed:", e);
  }
};
