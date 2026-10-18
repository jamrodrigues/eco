"use client"

export default function BottomSheetDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] md:hidden" data-testid="bottom-sheet-drawer">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-3" />
        {children}
      </div>
    </div>
  )
}
