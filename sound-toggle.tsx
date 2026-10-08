import { Volume2, VolumeX } from 'lucide-react'

interface SoundToggleProps {
  muted: boolean
  onToggle: () => void
}

export function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-[#f5c518]"
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={!muted}
    >
      {muted ? (
        <VolumeX className="size-3.5 text-white/60" aria-hidden="true" />
      ) : (
        <Volume2 className="size-3.5 text-[#f5c518]" aria-hidden="true" />
      )}
      <span aria-hidden="true">{muted ? 'Off' : 'On'}</span>
    </button>
  )
}
