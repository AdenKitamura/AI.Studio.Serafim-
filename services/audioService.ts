
export const playAlarmSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const playNote = (freq: number, start: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + start + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        oscillator.start(ctx.currentTime + start);
        oscillator.stop(ctx.currentTime + start + duration);
    };

    // Мелодичный двухтональный сигнал
    playNote(659.25, 0, 0.4); // E5
    playNote(880.00, 0.1, 0.6); // A5

  } catch (e) {
    console.error("Audio engine failed:", e);
  }
};
