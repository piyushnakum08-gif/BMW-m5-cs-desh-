import {
  ACCELERATION,
  BASE_SPEED,
  COIN_RADIUS,
  COIN_VALUE,
  DISTANCE_PER_POINT,
  GAME_HEIGHT,
  LANE_COUNT,
  LANE_WIDTH,
  MAX_SPEED,
  PLAYER_H,
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  PLAYER_W,
  PLAYER_Y,
  ROAD_LEFT,
  STEER_SPEED,
  TRAFFIC_FACTOR,
  laneCenter,
} from './constants'
import type { Coin, Popup, TrafficCar, TrafficKind } from './draw'

export interface World {
  playerX: number
  playerVX: number
  roadOffset: number
  speed: number
  elapsed: number
  distance: number
  coinsCollected: number
  score: number
  traffic: TrafficCar[]
  coins: Coin[]
  popups: Popup[]
  rowTimer: number
  coinTimer: number
  crashFlash: number
}

export interface Input {
  left: boolean
  right: boolean
  targetX: number | null
}

export function createInput(): Input {
  return { left: false, right: false, targetX: null }
}

export function swipeTarget(world: World, input: Input, direction: -1 | 1) {
  const from = input.targetX ?? world.playerX
  const currentLane = Math.round((from - ROAD_LEFT - LANE_WIDTH / 2) / LANE_WIDTH)
  const nextLane = Math.max(0, Math.min(LANE_COUNT - 1, currentLane + direction))
  input.targetX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, laneCenter(nextLane)))
}

export interface UpdateEvents {
  coinsPicked: number
  crashed: boolean
}

const TRAFFIC_COLORS = ['#d9d9d6', '#1f4fa8', '#a3201c', '#e3b21b', '#5b5f66', '#f2f2f0', '#6b2f86', '#127a72']

const KIND_SIZES: Record<TrafficKind, { w: number; h: number }> = {
  sedan: { w: 44, h: 88 },
  suv: { w: 48, h: 96 },
  van: { w: 50, h: 112 },
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function shuffledLanes() {
  const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i)
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
  }
  return lanes
}

export function createWorld(): World {
  return {
    playerX: laneCenter(1) + 40,
    playerVX: 0,
    roadOffset: 0,
    speed: BASE_SPEED,
    elapsed: 0,
    distance: 0,
    coinsCollected: 0,
    score: 0,
    traffic: [],
    coins: [],
    popups: [],
    rowTimer: 520,
    coinTimer: 420,
    crashFlash: 0,
  }
}

function spawnTrafficRow(world: World) {
  const difficulty = (world.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
  const roll = Math.random()
  let count = 1
  if (roll < 0.25 + difficulty * 0.35) count = 2
  if (difficulty > 0.45 && roll < 0.12 + difficulty * 0.15) count = 3

  const lanes = shuffledLanes().slice(0, count)
  const kinds: TrafficKind[] = ['sedan', 'sedan', 'suv', 'van']
  for (const lane of lanes) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    const size = KIND_SIZES[kind]
    world.traffic.push({
      x: laneCenter(lane) + rand(-4, 4),
      y: -size.h / 2 - rand(0, 30),
      w: size.w,
      h: size.h,
      kind,
      color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)],
    })
  }
}

function spawnCoinTrail(world: World) {
  const lane = Math.floor(Math.random() * LANE_COUNT)
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    world.coins.push({ x: laneCenter(lane), y: -COIN_RADIUS - i * 56, phase: i * 0.6 })
  }
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh
}

export function idleWorld(world: World, dt: number) {
  world.roadOffset += BASE_SPEED * 0.35 * dt
  world.crashFlash = Math.max(0, world.crashFlash - dt * 1.5)
}

export function updateWorld(world: World, input: Input, dt: number): UpdateEvents {
  const events: UpdateEvents = { coinsPicked: 0, crashed: false }

  world.elapsed += dt
  world.speed = Math.min(MAX_SPEED, BASE_SPEED + world.elapsed * ACCELERATION)
  const move = world.speed * dt
  world.roadOffset += move
  world.distance += move

  let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (dir !== 0) {
    input.targetX = null
  } else if (input.targetX !== null) {
    const diff = input.targetX - world.playerX
    if (Math.abs(diff) < 2) input.targetX = null
    else dir = Math.sign(diff) * Math.min(1, Math.abs(diff) / 24)
  }
  world.playerVX += (dir * STEER_SPEED - world.playerVX) * Math.min(1, dt * 10)
  world.playerX += world.playerVX * dt
  if (world.playerX < PLAYER_MIN_X || world.playerX > PLAYER_MAX_X) {
    world.playerX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, world.playerX))
    world.playerVX = 0
  }

  const trafficMove = move * TRAFFIC_FACTOR
  world.rowTimer -= trafficMove
  if (world.rowTimer <= 0) {
    spawnTrafficRow(world)
    world.rowTimer = world.speed * TRAFFIC_FACTOR * rand(0.42, 0.62) + 140
  }

  world.coinTimer -= move
  if (world.coinTimer <= 0) {
    spawnCoinTrail(world)
    world.coinTimer = rand(520, 900)
  }

  for (const car of world.traffic) car.y += trafficMove
  world.traffic = world.traffic.filter((car) => car.y - car.h / 2 < GAME_HEIGHT + 20)

  for (const coin of world.coins) coin.y += move

  const hitW = PLAYER_W - 8
  const hitH = PLAYER_H - 10

  world.coins = world.coins.filter((coin) => {
    if (coin.y - COIN_RADIUS > GAME_HEIGHT) return false
    const hit = overlaps(
      world.playerX,
      PLAYER_Y,
      PLAYER_W,
      PLAYER_H,
      coin.x,
      coin.y,
      COIN_RADIUS * 2,
      COIN_RADIUS * 2,
    )
    if (hit) {
      events.coinsPicked++
      world.popups.push({ x: coin.x, y: coin.y, life: 1 })
    }
    return !hit
  })
  world.coinsCollected += events.coinsPicked

  for (const popup of world.popups) {
    popup.y -= 60 * dt
    popup.life -= dt * 1.6
  }
  world.popups = world.popups.filter((p) => p.life > 0)

  for (const car of world.traffic) {
    if (overlaps(world.playerX, PLAYER_Y, hitW, hitH, car.x, car.y, car.w - 6, car.h - 8)) {
      events.crashed = true
      world.crashFlash = 1
      break
    }
  }

  world.score = Math.floor(world.distance / DISTANCE_PER_POINT) + world.coinsCollected * COIN_VALUE
  return events
}
