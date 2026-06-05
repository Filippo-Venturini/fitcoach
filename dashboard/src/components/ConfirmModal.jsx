export function ConfirmModal({ message, detail, onConfirm, onCancel, confirmLabel = 'ELIMINA', isPending = false }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm">
        <p className="font-heading font-bold italic text-xl uppercase text-white mb-2">{message}</p>
        {detail && (
          <p className={`text-sm mb-6 ${detail.startsWith('Errore') ? 'text-red-400' : 'text-slate-400'}`}>
            {detail}
          </p>
        )}
        {!detail && <div className="mb-6" />}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="btn-ghost flex-1 justify-center disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger flex-1 justify-center disabled:opacity-50"
          >
            {isPending ? 'ELIMINAZIONE...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
