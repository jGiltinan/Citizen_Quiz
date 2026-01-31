"use client";

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
    stream: MediaStream | null;
    isListening: boolean; // User is speaking
    isProcessing: boolean; // AI is thinking
    isSpeaking: boolean; // AI is speaking (Text to Speech)
}

export default function AudioVisualizer({ stream, isListening, isProcessing, isSpeaking }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        if (!stream || !isListening || !canvasRef.current) {
            // If not listening, stop animation
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 256;
        source.connect(analyser);

        analyserRef.current = analyser;
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            if (!isListening) return; // double check

            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArrayRef.current as any);

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArrayRef.current![i] / 2; // Scale down

                // Gradient color: Cream to Gold
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#F0EBD8'); // Cream
                gradient.addColorStop(1, '#E0E1DD'); // Gold/Silver

                ctx.fillStyle = gradient;

                // Draw rounded bars
                ctx.beginPath();
                ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 5);
                ctx.fill();

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
            audioContext.close();
        };
    }, [stream, isListening]);

    return (
        <div className="relative w-full h-32 flex items-center justify-center">
            {/* Mic Visualization */}
            {isListening && (
                <canvas ref={canvasRef} width={600} height={128} className="w-full h-full max-w-2xl" />
            )}

            {/* AI Processing Animation */}
            {isProcessing && (
                <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className="w-4 h-4 bg-cream rounded-full"
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            )}

            {/* AI Speaking Animation */}
            {isSpeaking && (
                <div className="relative flex items-center justify-center">
                    {/* Pulsing rings */}
                    <motion.div
                        className="absolute w-20 h-20 border-2 border-cream/50 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-20 h-20 border-2 border-gold/50 rounded-full"
                        animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                    <div className="z-10 bg-cream/80 p-4 rounded-full shadow-lg">
                        <div className="w-8 h-8 rounded-full bg-navy" />
                    </div>
                </div>
            )}

            {/* Idle State */}
            {!isListening && !isProcessing && !isSpeaking && (
                <div className="text-white/50 text-sm">Ready to start...</div>
            )}
        </div>
    );
}
