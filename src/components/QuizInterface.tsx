"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, RefreshCw, AlertCircle } from 'lucide-react';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import AudioVisualizer from './AudioVisualizer';

type QuizState = 'idle' | 'initializing' | 'speaking_question' | 'listening' | 'processing' | 'speaking_feedback' | 'error';

export default function QuizInterface() {
    const [state, setState] = useState<QuizState>('idle');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [lastFeedback, setLastFeedback] = useState<string>('');
    const [threadId, setThreadId] = useState<string | null>(null);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const { isRecording, startRecording, stopRecording, audioBlob, stream, initializeAudio } = useAudioRecorder();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Helper to play text as audio
    const speakText = async (text: string, onComplete?: () => void) => {
        try {
            const response = await fetch('/api/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error('TTS failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.onended = () => {
                    onComplete?.();
                };
                audioRef.current.play();
            }
        } catch (e) {
            console.error(e);
            setErrorMsg("Failed to play audio.");
            setState('error');
        }
    };

    const startQuiz = async () => {
        setState('initializing');
        setErrorMsg('');
        try {
            // 0. Initialize Audio IMMEDIATELY (User Gesture Requirement for Mobile)
            await initializeAudio();

            // 1. Init (Get Assistant) if needed
            let aid = assistantId;
            if (!aid) {
                const initRes = await fetch('/api/assistant', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'init' })
                });
                const initData = await initRes.json();
                if (initData.error) throw new Error(initData.error);
                aid = initData.assistantId;
                setAssistantId(aid);
            }

            // 2. Start Thread & Get First Question
            const res = await fetch('/api/assistant', {
                method: 'POST',
                body: JSON.stringify({ action: 'start', assistantId: aid })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setThreadId(data.threadId);
            setCurrentQuestion(data.message);

            setState('speaking_question');
            await speakText(data.message, () => {
                setState('listening');
                startRecording();
            });

        } catch (e: any) {
            setErrorMsg(e.message || "Failed to start quiz");
            setState('error');
        }
    };

    const fetchQuestion = async (tid: string) => {
        setState('processing');
        try {
            const res = await fetch('/api/assistant', {
                method: 'POST',
                body: JSON.stringify({ action: 'question', threadId: tid })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setCurrentQuestion(data.message);

            setState('speaking_question');
            await speakText(data.message, () => {
                // Auto-start recording after question? 
                // Or wait for user? Let's wait for user for better UX/Permission handling.
                setState('idle'); // Actually, state should be 'awaiting_answer' but 'idle' with question visible works
            });

        } catch (e: any) {
            setErrorMsg(e.message || "Failed to get question");
            setState('error');
        }
    };

    const submitAnswer = async () => {
        if (!audioBlob) return;

        setState('processing');
        try {
            // 1. Transcribe
            const formData = new FormData();
            formData.append('file', audioBlob, 'input.webm');

            const transRes = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
            const transData = await transRes.json();
            if (transData.error) throw new Error(transData.error);

            const userText = transData.text;

            // 2. Submit to Assistant (Returns Feedback AND Next Question)
            const res = await fetch('/api/assistant', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'answer',
                    threadId: threadId,
                    assistantId: assistantId,
                    answer: userText
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setLastFeedback(data.feedback);
            setCurrentQuestion(data.nextQuestion);

            // 3. Speak Feedback
            setState('speaking_feedback');
            await speakText(data.feedback, async () => {
                // 4. Speak Next Question
                setState('speaking_question');
                setLastFeedback(''); // Clear feedback
                await speakText(data.nextQuestion, () => {
                    setState('listening');
                    startRecording();
                });
            });

        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to submit answer");
            setState('error');
        }
    };

    // Effect to trigger submission when recording stops and we have a blob
    // Note: audioBlob updates *after* stopRecording.
    // But we need to distinguish between "just stopped" and "old blob".
    // Use a ref or simple effect dependency?
    // User workflow: Click Stop -> Confirmation? Or Auto-submit?
    // Let's make it manual "Send" or auto. 
    // For "Practice" apps, Auto-submit on stop is usually preferred IF silence detection is good.
    // With manual button, user clicks "Stop & Send".

    // Simplified flow:
    // 1. User clicks Mic -> Starts Recording.
    // 2. User clicks Stop -> Stops Recording AND Submits.

    const handleToggleRecord = async () => {
        if (isRecording) {
            stopRecording();
            // We need to wait for blob to be available. 
            // The useAudioRecorder updates blob asynchronously. 
            // Implementation detail: `submitAnswer` needs the blob.
            // Solution: `useEffect` on `audioBlob`.
        } else {
            await startRecording();
            setState('listening');
        }
    };

    useEffect(() => {
        if (!isRecording && audioBlob && state === 'listening') {
            submitAnswer();
        }
    }, [isRecording, audioBlob]);


    return (
        <div className="w-full max-w-4xl mx-auto p-6 flex flex-col items-center gap-8">
            <audio ref={audioRef} className="hidden" />

            {/* Status / Error */}
            {state === 'error' && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {errorMsg}
                    <button onClick={startQuiz} className="ml-4 underline hover:text-white">Retry</button>
                </div>
            )}

            {/* Visualizer */}
            <div className="glass-panel w-full rounded-2xl p-8 min-h-[200px] flex items-center justify-center bg-navy/30">
                <AudioVisualizer
                    stream={stream}
                    isListening={isRecording}
                    isProcessing={state === 'processing' || state === 'initializing'}
                    isSpeaking={state === 'speaking_question' || state === 'speaking_feedback'}
                />
            </div>

            {/* Text Display area */}
            <div className="w-full space-y-4 text-center">
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div
                            key="question"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-2xl font-light text-cream"
                        >
                            {currentQuestion}
                        </motion.div>
                    )}

                    {state === 'speaking_feedback' && lastFeedback && (
                        <motion.div
                            key="feedback"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            className="text-lg text-gold italic mt-4"
                        >
                            {lastFeedback}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
                {!threadId ? (
                    <button
                        onClick={startQuiz}
                        disabled={state === 'initializing'}
                        className="px-8 py-4 bg-cream text-navy rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-cream/20"
                    >
                        {state === 'initializing' ? <RefreshCw className="animate-spin" /> : <Play fill="currentColor" />}
                        Start Quiz
                    </button>
                ) : (
                    <button
                        onClick={handleToggleRecord}
                        disabled={state === 'processing' || state === 'speaking_question' || state === 'speaking_feedback'}
                        className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                    ${isRecording ? 'bg-red-500 shadow-red-500/30 scale-110' : 'bg-cream text-navy hover:bg-white'}
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                 `}
                    >
                        {isRecording ? <Square fill="currentColor" className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8" />}
                    </button>
                )}
            </div>

            <div className="text-white/30 text-sm">
                {state === 'listening' ? "Listening..." :
                    state === 'processing' ? "Thinking..." :
                        state === 'speaking_question' ? "Asking..." :
                            state === 'speaking_feedback' ? "Feedback..." : ""}
            </div>
        </div>
    );
}
