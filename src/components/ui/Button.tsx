import { forwardRef, type ButtonHTMLAttributes, type ReactElement, cloneElement } from 'react'
import { cn } from '@/lib/utils/cn'

const variants = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-500',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500',
  link:      'text-indigo-600 underline-offset-4 hover:underline focus-visible:ring-indigo-600 p-0 h-auto',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  /** Render as a child element (e.g. <Link>) instead of <button> */
  asChild?: boolean
}

const buttonClasses = (variant: keyof typeof variants, size: keyof typeof sizes, className?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    variant !== 'link' && sizes[size],
    className
  )

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, asChild, children, ...props }, ref) => {
    if (asChild && children) {
      const child = children as ReactElement<{ className?: string; children?: ReactElement }>
      return cloneElement(child, {
        className: buttonClasses(variant, size, cn(child.props.className, className)),
        children: (
          <>
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {child.props.children}
          </>
        ),
      })
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses(variant, size, className)}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
