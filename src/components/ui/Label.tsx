import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-slate-700 leading-none', className)}
      {...props}
    />
  )
)
Label.displayName = 'Label'

export { Label }
