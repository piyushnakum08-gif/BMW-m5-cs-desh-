import {
  COIN_RADIUS,
  GAME_HEIGHT,
  GAME_WIDTH,
  LANE_COUNT,
  LANE_WIDTH,
  PLAYER_H,
  PLAYER_W,
  ROAD_LEFT,
  ROAD_WIDTH,
} from './constants'

export type TrafficKind = 'sedan' | 'suv' | 'van'

export interface TrafficCar {
  x: number
  y: number
  w: number
  h: number
  color: string
  kind: TrafficKind
}

export interface Coin {
  x: number
  y: number
  phase: number
}

export interface Popup {
  x: number
  y: number
  life: number
}

const BLACK_EDGE = '#030303'
const BLACK_BODY = '#0d0e10'
const BLACK_SHINE = '#2a2d33'
const CARBON = '#1a1c1b'
const GLASS = '#0e1513'
const GOLD_RIM = '#b8933f'

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export function drawRoad(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = '#142017'
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  ctx.fillStyle = '#18281b'
  const grassPeriod = 70
  const grassStart = (offset % grassPeriod) - grassPeriod
  for (let y = grassStart; y < GAME_HEIGHT; y += grassPeriod) {
    ctx.fillRect(10, y, 18, 6)
    ctx.fillRect(GAME_WIDTH - 30, y + 35, 18, 6)
  }

  ctx.fillStyle = '#2a2d30'
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, GAME_HEIGHT)

  const curbPeriod = 60
  const curbStart = (offset % curbPeriod) - curbPeriod
  for (let y = curbStart; y < GAME_HEIGHT; y += curbPeriod) {
    ctx.fillStyle = '#c7322b'
    ctx.fillRect(ROAD_LEFT - 8, y, 8, curbPeriod / 2)
    ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, y, 8, curbPeriod / 2)
    ctx.fillStyle = '#e8e8e8'
    ctx.fillRect(ROAD_LEFT - 8, y + curbPeriod / 2, 8, curbPeriod / 2)
    ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, y + curbPeriod / 2, 8, curbPeriod / 2)
  }

  ctx.fillStyle = 'rgba(240, 240, 240, 0.85)'
  ctx.fillRect(ROAD_LEFT + 8, 0, 3, GAME_HEIGHT)
  ctx.fillRect(ROAD_LEFT + ROAD_WIDTH - 11, 0, 3, GAME_HEIGHT)

  const dashPeriod = 90
  const dashStart = (offset % dashPeriod) - dashPeriod
  ctx.fillStyle = 'rgba(240, 240, 240, 0.7)'
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = ROAD_LEFT + lane * LANE_WIDTH - 2
    for (let y = dashStart; y < GAME_HEIGHT; y += dashPeriod) {
      ctx.fillRect(x, y, 4, 42)
    }
  }
}

function poly(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fill()
}

function mirrorPoly(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  poly(ctx, points)
  poly(
    ctx,
    points.map(([px, py]) => [-px, py] as [number, number]),
  )
}

function drawHeadlightBeams(ctx: CanvasRenderingContext2D, top: number, halfW: number) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const side of [-1, 1]) {
    const sx = side * (halfW - 8)
    const grad = ctx.createLinearGradient(0, top, 0, top - 150)
    grad.addColorStop(0, 'rgba(220, 235, 255, 0.32)')
    grad.addColorStop(0.5, 'rgba(200, 220, 255, 0.1)')
    grad.addColorStop(1, 'rgba(200, 220, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(sx - 5, top + 4)
    ctx.lineTo(sx + 5, top + 4)
    ctx.lineTo(sx + 26 + side * 6, top - 150)
    ctx.lineTo(sx - 26 + side * 6, top - 150)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function drawPlayerCar(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
  const w = PLAYER_W
  const h = PLAYER_H
  const hw = w / 2
  const top = -h / 2
  const bottom = h / 2

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)

  drawHeadlightBeams(ctx, top, hw)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  rr(ctx, -hw + 4, top + 6, w, h, 14)

  for (const wy of [top + 13, bottom - 33]) {
    for (const side of [-1, 1]) {
      const wx = side === -1 ? -hw - 3 : hw - 7
      ctx.fillStyle = '#050505'
      rr(ctx, wx, wy, 10, 21, 3)
      ctx.fillStyle = GOLD_RIM
      ctx.fillRect(side === -1 ? wx : wx + 8, wy + 3, 2, 15)
    }
  }

  const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0)
  bodyGrad.addColorStop(0, BLACK_EDGE)
  bodyGrad.addColorStop(0.22, BLACK_BODY)
  bodyGrad.addColorStop(0.5, BLACK_SHINE)
  bodyGrad.addColorStop(0.78, BLACK_BODY)
  bodyGrad.addColorStop(1, BLACK_EDGE)
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.moveTo(-hw + 6, top + 2)
  ctx.quadraticCurveTo(0, top - 2, hw - 6, top + 2)
  ctx.quadraticCurveTo(hw, top + 4, hw, top + 16)
  ctx.lineTo(hw, bottom - 12)
  ctx.quadraticCurveTo(hw, bottom, hw - 8, bottom)
  ctx.lineTo(-hw + 8, bottom)
  ctx.quadraticCurveTo(-hw, bottom, -hw, bottom - 12)
  ctx.lineTo(-hw, top + 16)
  ctx.quadraticCurveTo(-hw, top + 4, -hw + 6, top + 2)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-hw + 2.5, top + 18)
  ctx.lineTo(-hw + 2.5, bottom - 14)
  ctx.moveTo(hw - 2.5, top + 18)
  ctx.lineTo(hw - 2.5, bottom - 14)
  ctx.stroke()

  ctx.fillStyle = CARBON
  rr(ctx, -hw + 4, top - 1, w - 8, 3, 1.5)

  ctx.fillStyle = '#0a0a0a'
  rr(ctx, -9, top + 1.5, 8, 7, [3, 3, 2, 2])
  rr(ctx, 1, top + 1.5, 8, 7, [3, 3, 2, 2])
  ctx.strokeStyle = '#9aa0a6'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.roundRect(-9, top + 1.5, 8, 7, [3, 3, 2, 2])
  ctx.roundRect(1, top + 1.5, 8, 7, [3, 3, 2, 2])
  ctx.stroke()

  ctx.save()
  ctx.shadowColor = 'rgba(210, 230, 255, 0.95)'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#eef4ff'
  mirrorPoly(ctx, [
    [-hw + 2, top + 6],
    [-12, top + 3.5],
    [-11, top + 8],
    [-hw + 3, top + 11],
  ])
  ctx.shadowColor = 'rgba(255, 210, 60, 0.9)'
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffd23f'
  mirrorPoly(ctx, [
    [-hw + 3.5, top + 7.5],
    [-13, top + 5.5],
    [-13, top + 6.8],
    [-hw + 3.5, top + 9],
  ])
  ctx.restore()

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  rr(ctx, -hw + 5, top + 14, 6, 2, 1)
  rr(ctx, hw - 11, top + 14, 6, 2, 1)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-7, top + 10)
  ctx.lineTo(-9, top + 30)
  ctx.moveTo(7, top + 10)
  ctx.lineTo(9, top + 30)
  ctx.stroke()

  ctx.fillStyle = CARBON
  mirrorPoly(ctx, [
    [-16, top + 17],
    [-11, top + 16],
    [-11, top + 22],
    [-15, top + 23],
  ])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const ly = top + 18 + i * 1.6
    ctx.moveTo(-15, ly)
    ctx.lineTo(-12, ly)
    ctx.moveTo(15, ly)
    ctx.lineTo(12, ly)
  }
  ctx.stroke()

  ctx.fillStyle = BLACK_BODY
  rr(ctx, -hw - 5, top + 31, 7, 5, [3, 1, 1, 3])
  rr(ctx, hw - 2, top + 31, 7, 5, [1, 3, 3, 1])

  ctx.fillStyle = GLASS
  poly(ctx, [
    [-hw + 7, top + 30],
    [hw - 7, top + 30],
    [hw - 4, top + 44],
    [-hw + 4, top + 44],
  ])
  ctx.fillStyle = 'rgba(180, 210, 255, 0.16)'
  poly(ctx, [
    [-hw + 11, top + 31],
    [-hw + 16, top + 31],
    [-hw + 11, top + 43],
    [-hw + 7, top + 43],
  ])

  ctx.fillStyle = CARBON
  rr(ctx, -hw + 5, top + 44, w - 10, 28, 3)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const ly = top + 46 + i * 4.5
    ctx.moveTo(-hw + 7, ly)
    ctx.lineTo(hw - 7, ly + 2)
  }
  ctx.stroke()

  ctx.fillStyle = GLASS
  poly(ctx, [
    [-hw + 4, top + 72],
    [hw - 4, top + 72],
    [hw - 8, top + 82],
    [-hw + 8, top + 82],
  ])

  ctx.fillStyle = CARBON
  rr(ctx, -hw + 4, bottom - 13, w - 8, 3, 1.5)

  const stripeColors = ['#5cb8e6', '#1c3f94', '#e22718']
  stripeColors.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(-4.5 + i * 3, bottom - 8.5, 3, 3.5)
  })

  ctx.save()
  ctx.shadowColor = 'rgba(255, 30, 40, 0.9)'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#e0141e'
  mirrorPoly(ctx, [
    [-hw + 2, bottom - 9],
    [-9, bottom - 7],
    [-9, bottom - 4.5],
    [-hw + 3, bottom - 4],
  ])
  ctx.restore()

  ctx.fillStyle = CARBON
  rr(ctx, -hw + 6, bottom - 2, w - 12, 3, 1)
  ctx.fillStyle = '#9aa0a6'
  for (const ex of [-15, -10, 10, 15]) {
    ctx.beginPath()
    ctx.arc(ex, bottom + 1, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#111'
  for (const ex of [-15, -10, 10, 15]) {
    ctx.beginPath()
    ctx.arc(ex, bottom + 1, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function drawTrafficCar(ctx: CanvasRenderingContext2D, car: TrafficCar) {
  const { w, h, color, kind } = car

  ctx.save()
  ctx.translate(car.x, car.y)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  rr(ctx, -w / 2 + 4, -h / 2 + 6, w, h, 10)

  ctx.rotate(Math.PI)
  const top = -h / 2
  const bottom = h / 2

  ctx.fillStyle = '#0a0a0a'
  for (const wy of [top + 12, bottom - 30]) {
    rr(ctx, -w / 2 - 2, wy, 8, 18, 3)
    rr(ctx, w / 2 - 6, wy, 8, 18, 3)
  }

  ctx.fillStyle = color
  rr(ctx, -w / 2, top, w, h, kind === 'van' ? 6 : [13, 13, 9, 9])

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
  rr(ctx, -w / 2 + 6, top + 6, w - 12, 18, 4)

  const windshieldTop = kind === 'van' ? top + 12 : top + 26
  ctx.fillStyle = GLASS
  ctx.beginPath()
  ctx.moveTo(-w / 2 + 7, windshieldTop)
  ctx.lineTo(w / 2 - 7, windshieldTop)
  ctx.lineTo(w / 2 - 4, windshieldTop + 12)
  ctx.lineTo(-w / 2 + 4, windshieldTop + 12)
  ctx.closePath()
  ctx.fill()

  const roofEnd = kind === 'van' ? bottom - 6 : kind === 'suv' ? bottom - 16 : bottom - 26
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  rr(ctx, -w / 2 + 5, windshieldTop + 12, w - 10, roofEnd - windshieldTop - 12, 3)

  if (kind !== 'van') {
    ctx.fillStyle = GLASS
    ctx.fillRect(-w / 2 + 7, roofEnd, w - 14, 8)
  }

  ctx.fillStyle = '#f4f1de'
  rr(ctx, -w / 2 + 3, top + 2, 10, 5, 2)
  rr(ctx, w / 2 - 13, top + 2, 10, 5, 2)

  ctx.fillStyle = '#b3121a'
  rr(ctx, -w / 2 + 2, bottom - 6, 10, 4, 1.5)
  rr(ctx, w / 2 - 12, bottom - 6, 10, 4, 1.5)

  ctx.restore()
}

export function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin, time: number) {
  const spin = Math.cos(time * 5 + coin.phase)
  const sx = Math.max(0.2, Math.abs(spin))
  const r = COIN_RADIUS

  ctx.save()
  ctx.translate(coin.x, coin.y)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(3, 5, r * sx, r, 0, 0, Math.PI * 2)
  ctx.fill()

  const grad = ctx.createLinearGradient(-r, -r, r, r)
  grad.addColorStop(0, '#fff1a8')
  grad.addColorStop(0.45, '#f5c518')
  grad.addColorStop(1, '#b07d0a')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, 0, r * sx, r, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#8f6406'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.strokeStyle = 'rgba(143, 100, 6, 0.7)'
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.62 * sx, r * 0.62, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

export function drawPopup(ctx: CanvasRenderingContext2D, popup: Popup) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, popup.life)
  ctx.fillStyle = '#f5c518'
  ctx.font = 'bold 20px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.fillText('+10', popup.x, popup.y)
  ctx.restore()
}

export function drawCrashFlash(ctx: CanvasRenderingContext2D, intensity: number) {
  if (intensity <= 0) return
  ctx.fillStyle = `rgba(226, 39, 24, ${intensity * 0.35})`
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
}
