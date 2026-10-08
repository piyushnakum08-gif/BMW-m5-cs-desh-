import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react'

export function TouchControls() {
  return (
    <div className="flex w-full max-w-[420px] items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50 md:hidden">
      <span className="flex items-center gap-1">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Hold left
      </span>
      <span className="flex items-center gap-1">
        <MoveHorizontal className="size-4" aria-hidden="true" />
        Swipe lanes
      </span>
      <span className="flex items-center gap-1">
        Hold right
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </div>
  )
}
