import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Loader2, Activity } from 'lucide-react';
import { logger } from '../services/logger';

interface LiveAudioAgentProps {
  onClose: () => void;
  userName: string;
}

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_GOOGLE_API_KEY) {
    return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  return '';
};

const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ onClose, userName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    startLiveSession();
    return () => {
      stopLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: `Ты Serafim, мудрый ИИ-ассистент. Общайся с пользователем ${userName} в реальном времени. Будь краток и полезен.`,
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            logger.log('LiveAPI', 'Connected to Gemini Live', 'success');

            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for UI
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              // Base64 encode
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }
          },
          onclose: () => {
            setIsConnected(false);
            logger.log('LiveAPI', 'Disconnected', 'warning');
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Ошибка соединения");
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось запустить Live API");
      setIsConnecting(false);
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    playbackQueueRef.current.push(float32Data);
    scheduleNextBuffer();
  };

  const scheduleNextBuffer = () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0 || !audioContextRef.current) return;

    isPlayingRef.current = true;
    const ctx = audioContextRef.current;
    const float32Data = playbackQueueRef.current.shift()!;

    const buffer = ctx.createBuffer(1, float32Data.length, 24000); // Gemini Live returns 24kHz
    buffer.copyToChannel(float32Data as any, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      isPlayingRef.current = false;
      scheduleNextBuffer();
    };
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={24} />
      </button>

      <div className="text-center space-y-8">
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          {/* Glow effect based on volume */}
          <div 
            className="absolute inset-0 bg-[var(--accent)] rounded-full blur-3xl opacity-20 transition-all duration-75"
            style={{ transform: `scale(${1 + volume * 5})` }}
          />
          
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center ${isConnected ? 'bg-[var(--accent)] text-black shadow-[0_0_40px_var(--accent-glow)]' : 'bg-white/10 text-white/50'}`}>
            {isConnecting ? (
              <Loader2 size={40} className="animate-spin" />
            ) : error ? (
              <MicOff size={40} className="text-red-400" />
            ) : (
              <Mic size={40} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
            Serafim Live
          </h2>
          <p className="text-[var(--text-muted)] font-mono text-sm">
            {isConnecting ? 'Установка нейронной связи...' : 
             error ? error : 
             'Связь установлена. Говорите.'}
          </p>
        </div>

        {isConnected && (
          <div className="flex justify-center gap-1 h-8 items-end">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-2 bg-[var(--accent)] rounded-t-sm transition-all duration-75"
                style={{ height: `${Math.max(10, volume * 200 * (Math.random() + 0.5))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAudioAgent;
