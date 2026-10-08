'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BASE_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIGH_SCORE_KEY,
  KMH_PER_PX,
  MAX_SPEED,
  PLAYER_Y,
  STEER_SPEED,
} from './constants'
import { drawCoin, drawCrashFlash, drawPlayerCar, drawPopup, drawRoad, drawTrafficCar } from './draw'
import { GameAudio } from './game-audio'
import { createInput, createWorld, idleWorld, swipeTarget, updateWorld, type Input } from './world'
import { GameHud } from './game-hud'
import { GameOverlay, type GameStatus } from './game-overlay'
import { SoundToggle } from './sound-toggle'
import { TouchControls } from './touch-controls'

const SWIPE_THRESHOLD = 28
const MUTED_KEY = 'm5cs-traffic-dash-muted'

interface ActivePointer {
  startX: number
  startY: number
  side: 'left' | 'right'
  swiped: boolean
}

interface HudState {
  score: number
  speed: number
  coins: number
}

export function TrafficDashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef(createWorld())
  const inputRef = useRef<Input>(createInput())
  const keysRef = useRef({ left: false, right: false })
  const pointersRef = useRef(new Map<number, ActivePointer>())
  const audioRef = useRef<GameAudio | null>(null)
  const statusRef = useRef<GameStatus>('ready')

  const [status, setStatus] = useState<GameStatus>('ready')
  const [hud, setHud] = useState<HudState>({ score: 0, speed: 0, coins: 0 })
  const [highScore, setHighScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [muted, setMuted] = useState(false)
  const highScoreRef = useRef(0)
  const mutedRef = useRef(false)

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? 0)
    if (Number.isFinite(stored) && stored > 0) {
      highScoreRef.current = stored
      setHighScore(stored)
    }
    if (window.localStorage.getItem(MUTED_KEY) === '1') {
      mutedRef.current = true
      setMuted(true)
    }
  }, [])

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new GameAudio()
      audioRef.current.setMuted(mutedRef.current)
    }
    return audioRef.current
  }, [])

  const startGame = useCallback(() => {
    worldRef.current = createWorld()
    inputRef.current = createInput()
    keysRef.current = { left: false, right: false }
    pointersRef.current.clear()
    statusRef.current = 'playing'
    setStatus('playing')
    setIsNewRecord(false)
    setHud({ score: 0, speed: Math.round(BASE_SPEED * KMH_PER_PX), coins: 0 })
    getAudio().startEngine()
  }, [getAudio])

  const endGame = useCallback(() => {
    const world = worldRef.current
    statusRef.current = 'over'
    setStatus('over')
    setHud({ score: world.score, speed: 0, coins: world.coinsCollected })
    const audio = getAudio()
    audio.stopEngine()
    audio.crash()
    if (world.score > highScoreRef.current) {
      highScoreRef.current = world.score
      setHighScore(world.score)
      setIsNewRecord(true)
      window.localStorage.setItem(HIGH_SCORE_KEY, String(world.score))
    }
  }, [getAudio])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    getAudio().setMuted(next)
    window.localStorage.setItem(MUTED_KEY, next ? '1' : '0')
  }, [getAudio])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = GAME_WIDTH * dpr
    canvas.height = GAME_HEIGHT * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let frame = 0
    let last = performance.now()
    let lastHudUpdate = 0
    let hudScore = -1

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const world = worldRef.current
      const time = now / 1000

      if (statusRef.current === 'playing') {
        const events = updateWorld(world, inputRef.current, dt)
        const audio = audioRef.current
        if (events.coinsPicked > 0) audio?.coin()
        audio?.update(
          (world.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED),
          Math.abs(world.playerVX) / STEER_SPEED,
          dt,
        )

        if (events.crashed) {
          endGame()
        } else if (now - lastHudUpdate > 100 || world.score !== hudScore) {
          lastHudUpdate = now
          hudScore = world.score
          setHud({
            score: world.score,
            speed: Math.round(world.speed * KMH_PER_PX),
            coins: world.coinsCollected,
          })
        }
      } else {
        idleWorld(world, statusRef.current === 'ready' ? dt : 0)
        world.crashFlash = Math.max(0, world.crashFlash - dt * 1.5)
      }

      drawRoad(ctx, world.roadOffset)
      for (const coin of world.coins) drawCoin(ctx, coin, time)
      for (const car of world.traffic) drawTrafficCar(ctx, car)
      const tilt = statusRef.current === 'playing' ? world.playerVX * 0.00035 : 0
      drawPlayerCar(ctx, world.playerX, PLAYER_Y, tilt)
      for (const popup of world.popups) drawPopup(ctx, popup)
      drawCrashFlash(ctx, world.crashFlash)

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [endGame])

  useEffect(() => {
    const keys = keysRef.current
    const pointers = pointersRef.current

    const syncInput = () => {
      let touchLeft = false
      let touchRight = false
      for (const p of pointers.values()) {
        if (p.swiped) continue
        if (p.side === 'left') touchLeft = true
        else touchRight = true
      }
      inputRef.current.left = keys.left || touchLeft
      inputRef.current.right = keys.right || touchRight
    }

    const setKey = (e: KeyboardEvent, pressed: boolean) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') {
        keys.left = pressed
        e.preventDefault()
        syncInput()
      } else if (key === 'arrowright' || key === 'd') {
        keys.right = pressed
        e.preventDefault()
        syncInput()
      } else if (pressed && (key === ' ' || key === 'enter') && statusRef.current !== 'playing') {
        const target = e.target as HTMLElement | null
        if (target?.tagName === 'BUTTON') return
        e.preventDefault()
        startGame()
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || statusRef.current !== 'playing') return
      if ((e.target as HTMLElement | null)?.closest('button')) return
      pointers.set(e.pointerId, {
        startX: e.clientX,
        startY: e.clientY,
        side: e.clientX < window.innerWidth / 2 ? 'left' : 'right',
        swiped: false,
      })
      syncInput()
    }

    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p || p.swiped || statusRef.current !== 'playing') return
      const dx = e.clientX - p.startX
      const dy = e.clientY - p.startY
      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
        p.swiped = true
        syncInput()
        swipeTarget(worldRef.current, inputRef.current, dx < 0 ? -1 : 1)
      }
    }

    const onPointerEnd = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return
      syncInput()
    }

    const resetAll = () => {
      keys.left = false
      keys.right = false
      pointers.clear()
      inputRef.current.targetX = null
      syncInput()
    }

    const onContextMenu = (e: Event) => {
      if (statusRef.current === 'playing') e.preventDefault()
    }

    const onDown = (e: KeyboardEvent) => setKey(e, true)
    const onUp = (e: KeyboardEvent) => setKey(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', resetAll)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', resetAll)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('contextmenu', onContextMenu)
    }
  }, [startGame])

  useEffect(() => () => audioRef.current?.dispose(), [])

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#142017] shadow-2xl shadow-black/60"
        style={{ aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`, maxWidth: `min(420px, calc((100dvh - 9rem) * ${GAME_WIDTH / GAME_HEIGHT}))` }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none select-none"
          role="img"
          aria-label="M5 CS Traffic Dash game track"
        />
        <GameHud
          score={hud.score}
          highScore={highScore}
          speed={status === 'playing' ? hud.speed : 0}
          coins={hud.coins}
          visible={status !== 'ready'}
        />
        <GameOverlay
          status={status}
          score={hud.score}
          coins={hud.coins}
          highScore={highScore}
          isNewRecord={isNewRecord}
          onStart={startGame}
        />
        <SoundToggle muted={muted} onToggle={toggleMute} />
      </div>
      <TouchControls />
    </div>
  )
}
