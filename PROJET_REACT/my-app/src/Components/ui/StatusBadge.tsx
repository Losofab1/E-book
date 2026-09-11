type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
}

const StatusBadge = ({ label, variant = 'neutral', className = '' }: StatusBadgeProps) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variantClasses[variant]} ${className}`}>
    {label}
  </span>
)

export default StatusBadge
