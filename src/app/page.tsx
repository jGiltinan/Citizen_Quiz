import QuizInterface from "@/components/QuizInterface";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-navy to-[#111] text-cream p-4 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-10">
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cream to-white drop-shadow-lg">
            Citizen Quiz
          </h1>
          <p className="text-xl text-white/60 font-light max-w-2xl mx-auto">
            Prepare for your US Naturalization Test with an AI-powered oral exam simulator.
          </p>
        </header>

        <QuizInterface />

      </div>
    </main>
  );
}
