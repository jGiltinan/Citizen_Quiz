import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
    isRecording: boolean;
    audioBlob: Blob | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    initializeAudio: () => Promise<void>;
    stream: MediaStream | null;
}

export default function useAudioRecorder(): AudioRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null); // Ref to keep track of stream without dependency loops

    // Initialize Audio (Call this on explicit User Interaction)
    const initializeAudio = useCallback(async () => {
        try {
            if (streamRef.current?.active) return; // Already valid

            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = mediaStream;
            setStream(mediaStream);
        } catch (error) {
            console.error("Error initializing audio:", error);
            throw error; // Re-throw to handle in UI
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            let mediaStream = streamRef.current;

            // If no stream exists or it's inactive, try to get it (This might fail if no user gesture, relies on initializeAudio being called first)
            if (!mediaStream || !mediaStream.active) {
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = mediaStream;
                setStream(mediaStream);
            }

            const mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);

                // DO NOT stop tracks here. Keep stream alive for next question.
            };

            mediaRecorder.start();
            setIsRecording(true);
            setAudioBlob(null);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone during start.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        };
    }, []);

    return { isRecording, audioBlob, startRecording, stopRecording, initializeAudio, stream };
}
