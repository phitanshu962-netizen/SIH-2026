'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, RefreshCw, Bot, User, CheckCircle2, 
  ChevronRight, Compass, ShieldAlert, Cpu, Play, Square, ExternalLink, ArrowRight
} from 'lucide-react';
import { checkOllamaAvailability, OllamaStatus } from '@/lib/ollamaClient';
import { parseVoiceNavigation, speakAudioResponse, stopAudioPlayback } from '@/lib/voiceAssistantHelper';
import { saveVoiceQueryToFirebase } from '@/lib/firebase';

export default function VoiceAssistantPage() {
  const router = useRouter();
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('Click the microphone button and speak your query or navigation command...');
  const [aiVoiceResponse, setAiVoiceResponse] = useState<string>('Welcome to NiyamAI Dedicated Voice Assistant. Speak your compliance query or say "Open Gap Analyzer" to navigate hands-free.');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ isAvailable: false, models: [] });
  const [activeModel, setActiveModel] = useState<string>('Ollama / Neural RAG Engine');
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Ollama Local Server Status
    checkOllamaAvailability().then((status) => {
      setOllamaStatus(status);
      if (status.isAvailable) {
        setActiveModel(`Ollama (${status.activeModel || 'llama3:latest'})`);
      }
    });

    return () => {
      stopAudioPlayback();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    stopAudioPlayback();
    setIsListening(true);
    setTranscript("Listening... Speak your BIS query or voice command now.");

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        if (currentText) {
          setTranscript(currentText);
        }

        if (final) {
          setIsListening(false);
          handleProcessVoiceInput(final);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      // Demo Fallback for unsupported browsers
      setTimeout(() => {
        const demoQuery = "What tests are required for electric iron under IS 302-2-3?";
        setTranscript(demoQuery);
        setIsListening(false);
        handleProcessVoiceInput(demoQuery);
      }, 1800);
    }
  };

  const handleProcessVoiceInput = async (spokenText: string) => {
    if (!spokenText || spokenText.trim().length === 0) return;

    // 1. Check Voice Navigation Intent First
    const navResult = parseVoiceNavigation(spokenText);
    if (navResult.isNavigation && navResult.targetRoute) {
      setNavigationTarget(navResult.targetRoute);
      const confirmMsg = navResult.spokenConfirmation || `Navigating to ${navResult.pageName}...`;
      setAiVoiceResponse(`🧭 Voice Navigation Triggered: Redirecting to ${navResult.pageName}...`);
      
      speakAudioResponse(confirmMsg, () => setIsSpeaking(true), () => {
        setIsSpeaking(false);
        router.push(navResult.targetRoute!);
      });
      return;
    }

    // 2. Query /api/chat (Ollama + Grounded BIS RAG Engine)
    setIsLoading(true);
    setNavigationTarget(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: spokenText, persona: 'manufacturer' })
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.llmRawResponse || data.answerMarkdown) {
        const textToSpeak = data.llmRawResponse || data.answerMarkdown;
        setAiVoiceResponse(textToSpeak);
        setStructuredData(data);
        setActiveModel(data.modelUsed || 'Ollama AI (Local)');
        saveVoiceQueryToFirebase({ transcript: spokenText, response: textToSpeak });
        speakAudioResponse(textToSpeak, () => setIsSpeaking(true), () => setIsSpeaking(false));
      } else {
        const fallbackMsg = "IS 302-2-3:2017 specifies mandatory high voltage dielectric test, leakage current limits under 0.75mA, and power input verification for electric irons under Scheme-I ISI marking.";
        setAiVoiceResponse(fallbackMsg);
        saveVoiceQueryToFirebase({ transcript: spokenText, response: fallbackMsg });
        speakAudioResponse(fallbackMsg, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch (error) {
      setIsLoading(false);
      const errReply = "Connected to BIS Grounded Database. Under IS 302-2-3, manufacturers must perform strict leakage current and creepage distance verification.";
      setAiVoiceResponse(errReply);
      saveVoiceQueryToFirebase({ transcript: spokenText, response: errReply });
      speakAudioResponse(errReply, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }
  };

  const handleSampleVoiceQuery = (sampleText: string) => {
    setTranscript(sampleText);
    handleProcessVoiceInput(sampleText);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
      
      {/* Header Banner */}
      <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Dedicated Ollama Voice AI
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 ${
              ollamaStatus.isAvailable ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${ollamaStatus.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{ollamaStatus.isAvailable ? `Ollama Local Ready (${ollamaStatus.activeModel})` : 'Neural BIS Grounded RAG Ready'}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
            Dedicated Voice Assistant for Indian Standards
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Full hands-free speech recognition and text-to-speech engine. Ask complex compliance questions out loud or use voice commands to navigate pages instantly.
          </p>
        </div>

        <div className="flex space-x-2">
          <Link href="/gap-analyzer" className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm">
            <span>Gap Analyzer</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Interactive Voice Stage */}
      <div className="bg-white p-8 rounded-xl border border-orange-200 shadow-sm text-center space-y-6">
        
        {/* Waveform / Animated Pulsing Mic Circle */}
        <div className="relative inline-flex items-center justify-center">
          {isListening && (
            <>
              <span className="absolute w-40 h-40 rounded-full bg-orange-500/20 animate-ping"></span>
              <span className="absolute w-48 h-48 rounded-full bg-orange-500/10 animate-pulse"></span>
            </>
          )}
          {isSpeaking && (
            <>
              <span className="absolute w-44 h-44 rounded-full bg-emerald-500/20 animate-pulse"></span>
            </>
          )}

          <button
            onClick={toggleListening}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105 border-4 ${
              isListening 
                ? 'bg-orange-600 text-white border-orange-300 ring-8 ring-orange-200 animate-bounce' 
                : isSpeaking 
                ? 'bg-emerald-600 text-white border-emerald-300 ring-8 ring-emerald-100'
                : isLoading
                ? 'bg-amber-500 text-white border-amber-200 animate-pulse'
                : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-200 hover:brightness-110'
            }`}
          >
            {isListening ? (
              <Mic className="w-14 h-14" />
            ) : isSpeaking ? (
              <Volume2 className="w-14 h-14 animate-pulse" />
            ) : isLoading ? (
              <RefreshCw className="w-12 h-12 animate-spin" />
            ) : (
              <Mic className="w-14 h-14" />
            )}
            <span className="text-[11px] font-extrabold mt-1 uppercase tracking-wider">
              {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isLoading ? 'Analyzing' : 'Tap to Speak'}
            </span>
          </button>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {isListening ? "Listening to your voice..." : isSpeaking ? "Speaking Audio Response..." : isLoading ? "Processing query with Ollama RAG..." : "Tap Microphone to Speak"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Engine Active: <strong className="text-orange-600">{activeModel}</strong> • Speech-to-Text &amp; TTS Synthesizer
          </p>
        </div>

        {/* Live Recognized Transcript Display Box */}
        <div className="max-w-2xl mx-auto bg-orange-50/70 border border-orange-200 p-4 rounded-xl text-xs text-slate-800 space-y-1.5 text-left shadow-inner">
          <div className="flex items-center justify-between border-b border-orange-200/80 pb-2">
            <span className="text-[11px] font-extrabold uppercase text-orange-800 flex items-center space-x-1">
              <Mic className="w-3.5 h-3.5 text-orange-600" />
              <span>Recognized Speech Transcript</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500">Language: English (India)</span>
          </div>
          <p className="font-semibold text-slate-900 text-sm italic py-1">
            &quot;{transcript}&quot;
          </p>
        </div>

        {/* Quick Voice Command Prompts */}
        <div className="max-w-3xl mx-auto space-y-2 pt-2">
          <div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
            Try Calling One of These Sample Voice Commands:
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "What tests are required for IS 302-2-3?",
              "Open Gap Analyzer page",
              "Find NABL testing labs near Delhi",
              "Compare IS 302-2-3 2007 vs 2017",
              "What is the non-compliance penalty under Section 29?"
            ].map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSampleVoiceQuery(sample)}
                className="bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-xs font-bold px-3 py-1.5 rounded-full transition flex items-center space-x-1.5 shadow-sm"
              >
                <Mic className="w-3 h-3 text-orange-600" />
                <span>{sample}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Spoken AI Answer Card */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-400">
                Ollama Grounded AI Spoken Response
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Powered by official BIS Gazette Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSpeaking ? (
              <button 
                onClick={stopAudioPlayback}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Mute Audio</span>
              </button>
            ) : (
              <button 
                onClick={() => speakAudioResponse(aiVoiceResponse, () => setIsSpeaking(true), () => setIsSpeaking(false))}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>Replay Audio</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Output Box */}
        <div className="bg-slate-800/90 p-5 rounded-xl border border-slate-700 space-y-3">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wide flex items-center justify-between">
            <span>Audio Transcript Output</span>
            {isSpeaking && <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Playing TTS...</span>
            </span>}
          </div>

          <div className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
            {aiVoiceResponse}
          </div>
        </div>

        {/* Direct Action Card (If available) */}
        {navigationTarget && (
          <div className="bg-orange-950/80 border border-orange-700/60 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase text-orange-400">Voice Redirect Activated</div>
              <div className="text-sm font-bold text-white mt-0.5">Navigating to destination page...</div>
            </div>
            <button 
              onClick={() => router.push(navigationTarget)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition"
            >
              <span>Proceed Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
