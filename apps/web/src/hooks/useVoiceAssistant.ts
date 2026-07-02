import { useState, useRef, useCallback } from 'react';
import { AiOrchestrator, AiIntent } from '../lib/aiOrchestrator';

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  transcript: string;
  volume: number;
  startListening: () => void;
  stopListening: () => void;
  playTTS: (text: string) => void;
  lastAction: { action: AiIntent; payload?: any } | null;
}

export function useVoiceAssistant(context: "visit" | "schedule" | "general" = "visit"): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const [lastAction, setLastAction] = useState<{ action: AiIntent; payload?: any } | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const playTTS = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 1.1; 
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleCommand = useCallback((text: string) => {
    // 1. Detect Intent using the unified AiOrchestrator
    const intent = AiOrchestrator.detectIntent(text);
    setLastAction({ action: intent, payload: { text } });

    // 2. TTS Feedback based on action (simplified for global router)
    if (intent === "schedule_appointment") {
      playTTS(`Открываю расписание для записи.`);
    } else if (intent === "fill_emk") {
      playTTS(`Обновляю медицинскую карту.`);
    } else if (intent === "parse_patient_document") {
      playTTS(`Открываю карточку пациента.`);
    } else if (intent === "manage_prices") {
      playTTS(`Открываю прайс-лист.`);
    } else {
       // Could be clinical_audit or patient_communication
    }
  }, [playTTS]);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (const val of dataArray) {
      sum += val;
    }
    const avgVolume = sum / dataArray.length;
    setVolume(avgVolume);
    
    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    }
  }, [isListening]);

  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("Speech Recognition API not supported in this browser.");
        playTTS("Система распознавания голоса не поддерживается в этом браузере.");
        return;
      }

      // Audio visualizer setup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsListening(true);
      setTranscript("");
      updateVolume();

      // STT setup
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      recognition.start();

    } catch (err) {
      console.error("Failed to start listening:", err);
      setIsListening(false);
    }
  }, [isListening, updateVolume, handleCommand, playTTS]);

  const stopListening = useCallback(() => {
    if (!isListening) return;
    
    setIsListening(false);
    setVolume(0);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    volume,
    startListening,
    stopListening,
    playTTS,
    lastAction
  };
}
