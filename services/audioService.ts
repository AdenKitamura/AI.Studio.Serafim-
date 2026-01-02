
// Tiny silent MP3 to keep the audio subsystem (and thus the main thread) active
const SILENT_TRACK = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAAtAAAB5AAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAAAAMAANFLVEAAAABAAABIAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAAEAAABIAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

let backgroundAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

export const initAudioSystem = () => {
  // 1. Initialize Context
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  
  // 2. Resume if suspended (browser policy)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }

  // 3. Start Silent Keep-Alive Loop
  if (!backgroundAudio) {
    backgroundAudio = new Audio(SILENT_TRACK);
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.01; // Non-zero volume is critical for iOS/Android to respect it
    
    // Try to play. This requires user interaction context, so call this function on click/tap.
    backgroundAudio.play().catch(e => console.debug("Audio autoplay blocked until interaction"));
    
    // Ensure it keeps playing if paused by system interruption
    backgroundAudio.addEventListener('pause', () => {
        // Try to resume after a short delay
        setTimeout(() => backgroundAudio?.play().catch(() => {}), 1000);
    });
  }
};

export const playAlarmSound = () => {
  try {
    if (!audioContext) initAudioSystem();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') audioContext.resume();

    const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const oscillator = audioContext!.createOscillator();
        const gainNode = audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext!.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioContext!.currentTime + start);
        
        // Aggressive Attack
        gainNode.gain.setValueAtTime(0, audioContext!.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext!.currentTime + start + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext!.currentTime + start + duration);

        oscillator.start(audioContext!.currentTime + start);
        oscillator.stop(audioContext!.currentTime + start + duration);
    };

    // Siren-like Urgent Sequence
    const now = 0;
    // Rapid pulses
    playNote(880, now, 0.2, 'square'); 
    playNote(880, now + 0.3, 0.2, 'square'); 
    playNote(880, now + 0.6, 0.4, 'square'); 
    
    // High pitch alert
    playNote(1760, now + 1.0, 0.5, 'sawtooth');

  } catch (e) {
    console.error("Audio engine failed:", e);
  }
};
