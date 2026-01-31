import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderState {
    isRecording: boolean;
    audioBlob: Blob | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    stream: MediaStream | null; // Exposed for visualizer
}

export default function useAudioRecorder(): AudioRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);

            const mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // webm is standard for Chrome/Firefox
                setAudioBlob(blob);

                // Stop all tracks
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setAudioBlob(null); // Reset previous recording

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please allow permissions.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    return { isRecording, audioBlob, startRecording, stopRecording, stream };
}
