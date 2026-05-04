import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../shadcn/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#E5E7EB] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl',
            'bg-[#111827] border text-[#E5E7EB]',
            'placeholder:text-[#9CA3AF]',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-[#EF4444] focus:ring-[#EF4444]/50'
              : 'border-white/10 focus:border-[#3B82F6] focus:ring-[#3B82F6]/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {helperText && (
          <p className={cn(
            'mt-1.5 text-sm',
            error ? 'text-[#EF4444]' : 'text-[#9CA3AF]'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
