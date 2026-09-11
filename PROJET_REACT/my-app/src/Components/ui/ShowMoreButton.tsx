interface ShowMoreButtonProps {
  showAll: boolean
  onToggle: () => void
}

const ShowMoreButton = ({ showAll, onToggle }: ShowMoreButtonProps) => (
  <div className="flex justify-center px-6 py-4">
    <button
      type="button"
      onClick={onToggle}
      className="rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
    >
      {showAll ? 'Voir moins' : 'Voir plus'}
    </button>
  </div>
)

export default ShowMoreButton
