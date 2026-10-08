interface EngineNodes {
  fire: OscillatorNode
  lope: OscillatorNode
  tremolo: OscillatorNode
  tremoloDepth: GainNode
  tone: BiquadFilterNode
  out: GainNode
  hiss: AudioBufferSourceNode
  hissFilter: BiquadFilterNode
  hissGain: GainNode
  turbo: OscillatorNode
  turboGain: GainNode
}

const MASTER_VOLUME = 0.7
const IDLE_RPM = 850
const CRUISE_RPM = 2600
const REDLINE_RPM = 7200
const STARTUP_IDLE_SECONDS = 1.1
const CRUISE_RAMP_SECONDS = 1.6
const POP_COOLDOWN = 0.35

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

function saturationCurve(drive: number) {
  const curve = new Float32Array(1024)
  const norm = Math.tanh(drive)
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(drive * x) / norm
  }
  return curve
}

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private popBus: GainNode | null = null
  private noise: AudioBuffer | null = null
  private engine: EngineNodes | null = null
  private muted = false

  private rpm = IDLE_RPM
  private startedAt = 0
  private steerPeak = 0
  private lastPopAt = 0

  private ensureContext() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()

      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -14
      compressor.ratio.value = 4
      compressor.attack.value = 0.003
      compressor.release.value = 0.2
      compressor.connect(ctx.destination)

      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : MASTER_VOLUME
      master.connect(compressor)

      // Pops run through their own hard saturation so they crack instead of hiss.
      const popShaper = ctx.createWaveShaper()
      popShaper.curve = saturationCurve(6)
      const popBus = ctx.createGain()
      popBus.gain.value = 0.9
      popBus.connect(popShaper).connect(master)

      const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

      this.ctx = ctx
      this.master = master
      this.popBus = popBus
      this.noise = noise
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return { ctx: this.ctx, master: this.master! }
  }

  startEngine() {
    const { ctx, master } = this.ensureContext()
    if (this.engine) return
    const now = ctx.currentTime
    const idleHz = IDLE_RPM / 15

    // V8 fires 4 times per crank revolution: firing Hz = rpm / 15.
    const fire = ctx.createOscillator()
    fire.type = 'sawtooth'
    fire.frequency.value = idleHz
    const fireGain = ctx.createGain()
    fireGain.gain.value = 0.55

    // Half-order component gives the uneven cross-plane "lope".
    const lope = ctx.createOscillator()
    lope.type = 'triangle'
    lope.frequency.value = idleHz / 2
    const lopeGain = ctx.createGain()
    lopeGain.gain.value = 0.7

    const shaper = ctx.createWaveShaper()
    shaper.curve = saturationCurve(3)
    shaper.oversample = '2x'

    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 520
    tone.Q.value = 1.4

    const chest = ctx.createBiquadFilter()
    chest.type = 'peaking'
    chest.frequency.value = 110
    chest.gain.value = 7
    chest.Q.value = 0.9

    const body = ctx.createGain()
    body.gain.value = 1
    const tremolo = ctx.createOscillator()
    tremolo.type = 'sine'
    tremolo.frequency.value = idleHz / 8
    const tremoloDepth = ctx.createGain()
    tremoloDepth.gain.value = 0.45
    tremolo.connect(tremoloDepth).connect(body.gain)

    const out = ctx.createGain()
    out.gain.setValueAtTime(0, now)
    out.gain.linearRampToValueAtTime(0.14, now + 0.35)

    fire.connect(fireGain).connect(shaper)
    lope.connect(lopeGain).connect(shaper)
    shaper.connect(tone).connect(chest).connect(body).connect(out).connect(master)

    const hiss = ctx.createBufferSource()
    hiss.buffer = this.noise
    hiss.loop = true
    const hissFilter = ctx.createBiquadFilter()
    hissFilter.type = 'bandpass'
    hissFilter.frequency.value = 700
    hissFilter.Q.value = 0.8
    const hissGain = ctx.createGain()
    hissGain.gain.value = 0.012
    hiss.connect(hissFilter).connect(hissGain).connect(master)

    const turbo = ctx.createOscillator()
    turbo.type = 'sine'
    turbo.frequency.value = 2400
    const turboGain = ctx.createGain()
    turboGain.gain.value = 0
    turbo.connect(turboGain).connect(master)

    fire.start(now)
    lope.start(now)
    tremolo.start(now)
    hiss.start(now)
    turbo.start(now)

    this.engine = { fire, lope, tremolo, tremoloDepth, tone, out, hiss, hissFilter, hissGain, turbo, turboGain }
    this.rpm = IDLE_RPM
    this.startedAt = now
    this.steerPeak = 0
    this.lastPopAt = now

    this.burble(0.55, 0.85)
  }

  /**
   * Called every frame while driving.
   * speedRatio: 0 at base speed, 1 at max speed. steer: 0..1 lateral effort.
   */
  update(speedRatio: number, steer: number, dt: number) {
    if (!this.ctx || !this.engine) return
    const t = this.ctx.currentTime
    const sinceStart = t - this.startedAt
    const speed = clamp01(speedRatio)
    const effort = clamp01(steer)

    let target: number
    if (sinceStart < STARTUP_IDLE_SECONDS) {
      const blip = sinceStart > 0.3 && sinceStart < 0.6 ? 2400 : 0
      target = IDLE_RPM + blip
    } else {
      const ramp = clamp01((sinceStart - STARTUP_IDLE_SECONDS) / CRUISE_RAMP_SECONDS)
      const cruise = CRUISE_RPM + speed * 2900 + effort * 1700
      target = IDLE_RPM + (cruise - IDLE_RPM) * ramp
    }
    target = Math.min(REDLINE_RPM, target)

    const rising = target > this.rpm
    this.rpm += (target - this.rpm) * Math.min(1, dt * (rising ? 7 : 3))

    const rpmN = clamp01((this.rpm - IDLE_RPM) / (REDLINE_RPM - IDLE_RPM))
    const load = clamp01(0.2 + speed * 0.35 + effort * 0.55 + (rising ? 0.15 : 0))
    const hz = this.rpm / 15
    const e = this.engine
    const tc = 0.03

    e.fire.frequency.setTargetAtTime(hz, t, tc)
    e.lope.frequency.setTargetAtTime(hz / 2, t, tc)
    e.tremolo.frequency.setTargetAtTime(Math.max(4, hz / 8), t, tc)
    e.tremoloDepth.gain.setTargetAtTime(0.06 + 0.42 * (1 - rpmN), t, tc)
    e.tone.frequency.setTargetAtTime(480 + rpmN * 2600 + load * 900, t, tc)
    e.out.gain.setTargetAtTime(0.11 + load * 0.12 + rpmN * 0.06, t, 0.06)
    e.hissFilter.frequency.setTargetAtTime(700 + rpmN * 2400, t, tc)
    e.hissGain.gain.setTargetAtTime(0.01 + load * 0.045, t, 0.06)
    e.turbo.frequency.setTargetAtTime(2400 + rpmN * 3400, t, 0.1)
    e.turboGain.gain.setTargetAtTime(load * rpmN * 0.014, t, 0.12)

    // Overrun burble: hard steering followed by a lift-off.
    this.steerPeak = Math.max(effort, this.steerPeak - dt * 1.2)
    if (effort < 0.25 && this.steerPeak > 0.7 && t - this.lastPopAt > POP_COOLDOWN) {
      this.burble(0.45 + speed * 0.4)
      this.steerPeak = 0
    }

    // Random crackle at high speed.
    if (speed > 0.45 && t - this.lastPopAt > POP_COOLDOWN && Math.random() < (speed - 0.45) * 2.4 * dt) {
      this.burble(0.25 + speed * 0.3)
    }
  }

  /** A short train of exhaust pops & bangs. */
  burble(intensity = 0.6, delay = 0) {
    if (!this.ctx || !this.popBus) return
    const start = this.ctx.currentTime + delay
    const count = 2 + Math.round(clamp01(intensity) * 4 + Math.random() * 2)
    let t = start
    for (let i = 0; i < count; i++) {
      const fade = 1 - i / (count + 1)
      const strength = clamp01(intensity) * fade * (0.6 + Math.random() * 0.5)
      this.pop(t, strength)
      t += 0.035 + Math.random() * 0.085
    }
    this.lastPopAt = start + (t - start)
  }

  private pop(time: number, strength: number) {
    if (!this.ctx || !this.popBus || !this.noise) return
    const ctx = this.ctx
    const dur = 0.025 + Math.random() * 0.05

    const crack = ctx.createBufferSource()
    crack.buffer = this.noise
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 280 + Math.random() * 1100
    band.Q.value = 0.9
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(0.0001, time)
    crackGain.gain.linearRampToValueAtTime(0.55 * strength + 0.02, time + 0.003)
    crackGain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    crack.connect(band).connect(crackGain).connect(this.popBus)
    crack.start(time, Math.random() * 1.8, dur + 0.03)

    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(70 + Math.random() * 60, time)
    thump.frequency.exponentialRampToValueAtTime(34, time + 0.07)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.0001, time)
    thumpGain.gain.linearRampToValueAtTime(0.7 * strength + 0.02, time + 0.004)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09)
    thump.connect(thumpGain).connect(this.popBus)
    thump.start(time)
    thump.stop(time + 0.1)
  }

  stopEngine() {
    if (!this.ctx || !this.engine) return
    const e = this.engine
    const t = this.ctx.currentTime
    for (const g of [e.out.gain, e.hissGain.gain, e.turboGain.gain]) {
      g.cancelScheduledValues(t)
      g.setTargetAtTime(0, t, 0.08)
    }
    for (const node of [e.fire, e.lope, e.tremolo, e.hiss, e.turbo]) node.stop(t + 0.6)
    this.engine = null
  }

  coin() {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    ;[988, 1319].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t + i * 0.07
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.25, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
      osc.connect(g).connect(this.master!)
      osc.start(start)
      osc.stop(start + 0.2)
    })
  }

  crash() {
    if (!this.ctx || !this.master || !this.noise) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const duration = 0.9

    const noise = ctx.createBufferSource()
    noise.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3000, t)
    filter.frequency.exponentialRampToValueAtTime(120, t + duration)
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.7, t)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    noise.connect(filter).connect(noiseGain).connect(this.master)
    noise.start(t, 0, duration)

    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(110, t)
    thump.frequency.exponentialRampToValueAtTime(30, t + 0.4)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.8, t)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    thump.connect(thumpGain).connect(this.master)
    thump.start(t)
    thump.stop(t + 0.5)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.05)
    }
  }

  dispose() {
    this.stopEngine()
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.popBus = null
    this.noise = null
  }
}
