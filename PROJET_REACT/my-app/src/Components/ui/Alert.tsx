import type { ReactNode } from 'react'

type AlertVariant = 'error' | 'info' | 'success'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  error: 'alert-error',
  info: 'alert-info',
  success: 'alert-success',
}

const Alert = ({ variant = 'info', children, className = '' }: AlertProps) => (
  <p role={variant === 'error' ? 'alert' : 'status'} className={`mt-4 ${variantClasses[variant]} ${className}`}>
    {children}
  </p>
)

export default Alert
