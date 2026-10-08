import { Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type GameStatus = 'ready' | 'playing' | 'over'

interface GameOverlayProps {
  status: GameStatus
  score: number
  coins: number
  highScore: number
  isNewRecord: boolean
  onStart: () => void
}

function MStripe() {
  return (
    <div className="flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden="true">
      <span className="flex-1 bg-[#5cb8e6]" />
      <span className="flex-1 bg-[#1c3f94]" />
      <span className="flex-1 bg-[#e22718]" />
    </div>
  )
}

export function GameOverlay({ status, score, coins, highScore, isNewRecord, onStart }: GameOverlayProps) {
  if (status === 'playing') return null

  const isOver = status === 'over'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/65 px-6 text-center backdrop-blur-[2px]"
      role="dialog"
      aria-modal="false"
      aria-labelledby="overlay-title"
    >
      <MStripe />

      {isOver ? (
        <>
          <div>
            <h2 id="overlay-title" className="text-4xl font-black uppercase tracking-tight text-white">
              Game Over
            </h2>
            {isNewRecord ? (
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#f5c518]">New high score</p>
            ) : (
              <p className="mt-2 text-sm text-white/60">You hit traffic.</p>
            )}
          </div>

          <dl className="grid w-full max-w-64 grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Score</dt>
              <dd className="font-mono text-2xl font-bold text-white tabular-nums">{score}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Coins</dt>
              <dd className="font-mono text-2xl font-bold text-[#f5c518] tabular-nums">{coins}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Best</dt>
              <dd className="font-mono text-2xl font-bold text-white tabular-nums">{highScore}</dd>
            </div>
          </dl>

          <Button
            size="lg"
            onClick={onStart}
            className="h-12 gap-2 bg-[#f5c518] px-8 text-base font-bold uppercase tracking-wide text-black hover:bg-[#ffd84a]"
            autoFocus
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            Restart
          </Button>
        </>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">BMW M5 CS</p>
            <h2 id="overlay-title" className="mt-1 text-balance text-4xl font-black uppercase leading-none tracking-tight text-white">
              Traffic Dash
            </h2>
          </div>

          <ul className="flex flex-col gap-1.5 text-sm text-white/75">
            <li>
              Steer with <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">←</kbd>{' '}
              <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">→</kbd> or{' '}
              <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">A</kbd>{' '}
              <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">D</kbd>
            </li>
            <li>On mobile: hold a screen side or swipe</li>
            <li>Dodge oncoming traffic</li>
            <li>
              Grab gold coins for <span className="font-bold text-[#f5c518]">+10</span>
            </li>
          </ul>

          {highScore > 0 && (
            <p className="font-mono text-sm text-white/60">
              Best: <span className="font-bold text-white">{highScore}</span>
            </p>
          )}

          <Button
            size="lg"
            onClick={onStart}
            className="h-12 gap-2 bg-[#f5c518] px-8 text-base font-bold uppercase tracking-wide text-black hover:bg-[#ffd84a]"
          >
            <Play className="size-5" aria-hidden="true" />
            Start Engine
          </Button>
        </>
      )}
    </div>
  )
}
