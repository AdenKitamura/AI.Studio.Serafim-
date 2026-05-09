import { useState, useRef } from 'react';
import { logger } from '../services/logger';
import { generateSpeech, transcribeAudio } from '../services/geminiService';

export const useChatAudio = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Playback Settings
    const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('sb_voice') || 'Charon');
    const [autoVoice, setAutoVoice] = useState<boolean>(() => localStorage.getItem('sb_auto_voice') !== 'false');
    const [voiceSpeed, setVoiceSpeed] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_speed') || '1.0'));
    const [voiceVolume, setVoiceVolume] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_volume') || '1.0'));
    const [voicePitch, setVoicePitch] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_pitch') || '0'));

    // Web Audio Ref
    const audioContextRef = useRef<AudioContext | null>(null);
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    
    // Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const mimeTypeRef = useRef<string>(''); 

    const applyASMR = () => {
        logger.log('Audio', 'Activating ASMR Mode...', 'info');
        setVoiceSpeed(0.85);
        setVoicePitch(-500);
        setVoiceVolume(1.3);
        localStorage.setItem('sb_voice_speed', '0.85');
        localStorage.setItem('sb_voice_pitch', '-500');
        localStorage.setItem('sb_voice_volume', '1.3');
    };

    const initAudioContext = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const stopAudio = () => {
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e){}
            activeSourceRef.current = null;
        }
        setIsPlaying(false);
    };

    const playGeminiAudio = async (text: string) => {
        if (isPlaying) stopAudio();
        
        const ctx = initAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        try {
            setIsPlaying(true);
            const base64Audio = await generateSpeech(text, selectedVoice);
            if (!base64Audio) {
                setIsPlaying(false);
                return;
            }

            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            
            const int16Data = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) float32Data[i] = int16Data[i] / 32768.0;

            const buffer = ctx.createBuffer(1, float32Data.length, 24000);
            buffer.copyToChannel(float32Data, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = voiceSpeed; 
            source.detune.value = voicePitch; 

            if (gainNodeRef.current) {
                gainNodeRef.current.gain.value = voiceVolume;
                source.connect(gainNodeRef.current);
            } else {
                source.connect(ctx.destination);
            }
            
            source.onended = () => {
                setIsPlaying(false);
                activeSourceRef.current = null;
            };
            
            source.start(0);
            activeSourceRef.current = source;
        } catch (e) {
            console.error("Audio Playback Error:", e);
            setIsPlaying(false);
        }
    };

    const toggleRecording = async (onTranscriptionResult: (text: string) => void) => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return;
        } 
        
        try { 
            // no echoCancellation to avoid phone earpiece mode
            const stream = await navigator.mediaDevices.getUserMedia({ 
               audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
            });
            streamRef.current = stream;
            audioChunksRef.current = [];
            
            const options = [
                'audio/webm;codecs=opus', 'audio/webm',
                'audio/ogg;codecs=opus', 'audio/ogg',
                'audio/mp4', 'audio/aac'
            ];
            
            let selectedType = '';
            for (const type of options) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedType = type;
                    break;
                }
            }
            
            if (!selectedType) {
                throw new Error("Не найден поддерживаемый формат аудио.");
            }
            mimeTypeRef.current = selectedType;

            const recorder = new MediaRecorder(stream, { mimeType: selectedType });
            mediaRecorderRef.current = recorder;
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            recorder.onstop = async () => {
                setIsProcessingAudio(true);
                stream.getTracks().forEach(t => t.stop()); 

                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                    const fileReader = new FileReader();
                    
                    fileReader.onloadend = async () => {
                        try {
                            const base64Data = (fileReader.result as string).split(',')[1];
                            const text = await transcribeAudio(base64Data, mimeTypeRef.current);
                            if (text && text.trim()) {
                                onTranscriptionResult(text);
                            } else {
                                logger.log('Voice', 'Ничего не распознано.', 'warning');
                            }
                        } catch (e: any) {
                            logger.log('Voice', `Ошибка распознавания: ${e?.message}`, 'error');
                        } finally {
                            setIsProcessingAudio(false);
                        }
                    };
                    
                    fileReader.readAsDataURL(audioBlob);
                } catch (e: any) {
                    setIsProcessingAudio(false);
                    logger.log('Voice', 'Ошибка обработки аудио', 'error');
                }
            };
            
            recorder.start(200); 
            setIsRecording(true);
        } catch (e: any) {
            console.error('Mic access error:', e);
            logger.log('Voice', 'Нет доступа к микрофону', 'error');
            alert('Нет доступа к микрофону. Проверьте разрешения браузера.');
        }
    };

    return {
        isRecording,
        isProcessingAudio,
        isPlaying,
        selectedVoice, setSelectedVoice,
        autoVoice, setAutoVoice,
        voiceSpeed, setVoiceSpeed,
        voiceVolume, setVoiceVolume,
        voicePitch, setVoicePitch,
        applyASMR,
        stopAudio,
        playGeminiAudio,
        toggleRecording
    };
};
