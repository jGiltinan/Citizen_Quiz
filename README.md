# Citizen Quiz

A conversational AI application designed to help users practice for the US Naturalization Test. The app simulates a verbal interview experience using AI-generated questions and feedback.

## Features

- **Conversational Interface**: Uses OpenAI's GPT-4o to act as a practice examiner.
- **Voice Interaction**: Includes Text-to-Speech (TTS) for asking questions and Speech-to-Text (STT) for capturing user answers.
- **Real-time Feedback**: Provides immediate correction and explanation for answers.
- **Audio Visualization**: Visual feedback during listening and speaking phases.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- OpenAI API Key

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/jGiltinan/Citizen_Quiz.git
    cd Citizen_Quiz
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Create a `.env` file in the root directory and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_api_key_here
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## iOS & Audio Support

Special attention has been given to support iOS devices (iPhone/iPad), which have strict policies regarding audio autoplay and microphone usage.

- **Audio Unlock**: The app plays a silent sound immediately upon "Start Quiz" to unlock the audio context for Safari.
- **Robust Recording**: The app acquires a fresh microphone stream for every question to maintain stability on iOS.
- **Fallback Mode**: If audio playback fails or the network is slow, the app includes a fallback to the device's system voice (SpeechSynthesis) to ensure the quiz can continue.

> [!WARNING]
> **Known Issue (Non-iOS Devices)**: The "fresh stream" logic implemented for iOS stability may cause regressions or instability on some Android or Desktop browsers. If you experience microphone issues on non-Apple devices, consider refreshing the page.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **AI/LLM**: OpenAI GPT-4o (Assistant API/Chat Completions)
- **Audio**: OpenAI TTS & Whisper (for transcription)
- **Styling**: Tailwind CSS, Framer Motion

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
