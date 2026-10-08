import { Trophy } from 'lucide-react'

interface GameHudProps {
  score: number
  highScore: number
  speed: number
  coins: number
  visible: boolean
}

export function GameHud({ score, highScore, speed, coins, visible }: GameHudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3 pb-8">
      <div className={visible ? 'opacity-100' : 'opacity-0'} aria-live="polite">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Score</p>
        <p className="font-mono text-3xl font-bold leading-none text-white tabular-nums">{score}</p>
        <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-[#f5c518] tabular-nums">
          <span className="inline-block size-2.5 rounded-full bg-[#f5c518]" aria-hidden="true" />
          {coins} <span className="sr-only">coins collected</span>
        </p>
      </div>

      <div className={`text-center ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <p className="font-mono text-xl font-bold leading-none text-white tabular-nums">{speed}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">km/h</p>
      </div>

      <div className="text-right">
        <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          <Trophy className="size-3 text-[#f5c518]" aria-hidden="true" />
          Best
        </p>
        <p className="font-mono text-xl font-bold leading-none text-white tabular-nums">{highScore}</p>
      </div>
    </div>
  )
}
