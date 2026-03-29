import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Input Component
 * Text input with label, error state, and password visibility toggle
 *
 * Props:
 * - label: Input label text
 * - type: 'text' | 'email' | 'password' | 'number'
 * - value: Controlled input value
 * - onChange: Change handler
 * - error: Error message string (shows red border + message)
 * - placeholder: Placeholder text
 * - disabled: Disable input
 * - required: Shows red asterisk
 */

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  error = '',
  placeholder = '',
  disabled = false,
  required = false,
  name,
  autoComplete,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false)

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={`flex flex-col gap-8 ${className}`}>
      {label && (
        <label className="text-14 font-medium text-text-primary">
          {label}
          {required && <span className="text-vermillion ml-4">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          autoComplete={autoComplete}
          className={`
            w-full px-16 py-12 text-15
            bg-bg-light text-text-primary
            border rounded-input
            transition-all duration-200
            placeholder:text-text-tertiary
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-vermillion focus:ring-opacity-30
            ${error ? 'border-red-500' : 'border-border-light hover:border-border-medium'}
          `}
        />

        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-12 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span className="text-13 text-red-500">
          {error}
        </span>
      )}
    </div>
  )
}

export default Input
