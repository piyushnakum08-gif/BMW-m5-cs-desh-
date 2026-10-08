import { TrafficDashGame } from '@/components/game/traffic-dash-game'

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 touch-none select-none overscroll-none bg-[#0b0f0c] px-4 py-4 text-white">
      <header className="flex w-full max-w-[420px] items-center justify-between">
        <h1 className="text-sm font-black uppercase tracking-[0.18em]">
          M5 CS <span className="text-[#f5c518]">Traffic Dash</span>
        </h1>
        <p className="hidden text-xs text-white/50 sm:block">Space to start</p>
      </header>
      <TrafficDashGame />
    </main>
  )
}
