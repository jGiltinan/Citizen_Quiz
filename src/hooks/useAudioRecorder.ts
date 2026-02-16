import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
    isRecording: boolean;
    audioBlob: Blob | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    initializeAudio: () => Promise<void>;
    stream: MediaStream | null;
    mimeType: string;
}

export default function useAudioRecorder(): AudioRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [mimeType, setMimeType] = useState<string>('audio/webm');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // We don't need initializeAudio anymore as we get stream on startRecording
    // but we keep the interface for compatibility if needed, or just remove it from usage.

    const startRecording = useCallback(async () => {
        try {
            // Always get a FRESH stream
            console.log("Acquiring fresh microphone stream...");
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            setStream(mediaStream);

            // Detect supported mime type
            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/aac',
                'audio/ogg;codecs=opus'
            ];
            const selectedType = types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
            setMimeType(selectedType);

            const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: selectedType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: selectedType });
                setAudioBlob(blob);

                // CRITICAL: Stop the stream tracks to release the mic on iOS
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setAudioBlob(null);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            // alert("Could not access microphone."); // Don't alert, let UI handle error
            throw error;
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
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
        };
    }, [stream]);

    // Keep initializeAudio as a no-op or just request permissions
    const initializeAudio = useCallback(async () => {
        // Just request permission to "warm up" if needed, but startRecording handles it now
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
    }, []);

    return { isRecording, audioBlob, startRecording, stopRecording, initializeAudio, stream, mimeType };
}
