import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

/**
 * Toast Notification System
 * Shows temporary notification messages
 *
 * Types:
 * - success: Green with checkmark
 * - error: Red with X
 * - warning: Orange with alert
 * - info: Blue with info icon
 *
 * Usage:
 * import { toast } from '@/components/ui/Toast'
 *
 * toast.success('Room created!')
 * toast.error('Failed to join room')
 * toast.warning('Connection unstable')
 * toast.info('New member joined')
 */

// Toast store (simple state management for toasts)
let toastId = 0
const toastListeners = new Set()

const toastStore = {
  toasts: [],
  subscribe: (listener) => {
    toastListeners.add(listener)
    return () => toastListeners.delete(listener)
  },
  emit: () => {
    toastListeners.forEach((listener) => listener(toastStore.toasts))
  },
  add: (toast) => {
    const id = toastId++
    toastStore.toasts = [...toastStore.toasts, { ...toast, id }]
    toastStore.emit()
    return id
  },
  remove: (id) => {
    toastStore.toasts = toastStore.toasts.filter((t) => t.id !== id)
    toastStore.emit()
  },
}

// Toast API
export const toast = {
  success: (message, duration = 3000) => {
    return toastStore.add({ type: 'success', message, duration })
  },
  error: (message, duration = 4000) => {
    return toastStore.add({ type: 'error', message, duration })
  },
  warning: (message, duration = 3500) => {
    return toastStore.add({ type: 'warning', message, duration })
  },
  info: (message, duration = 3000) => {
    return toastStore.add({ type: 'info', message, duration })
  },
  dismiss: (id) => {
    toastStore.remove(id)
  },
}

// Single toast item component
const ToastItem = ({ toast: toastData }) => {
  const { id, type, message, duration } = toastData

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      toastStore.remove(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration])

  // Icon mapping
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  }

  // Style mapping
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-orange-50 text-orange-800 border-orange-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-start gap-12 px-16 py-12
        rounded-button border shadow-lg
        min-w-[300px] max-w-[500px]
        ${styles[type]}
      `}
    >
      <div className="flex-shrink-0 mt-2">
        {icons[type]}
      </div>

      <div className="flex-1 text-14 font-medium">
        {message}
      </div>

      <button
        onClick={() => toastStore.remove(id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

// Toast container component (add this to App.jsx)
const ToastContainer = () => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return toastStore.subscribe(setToasts)
  }, [])

  return (
    <div className="fixed top-24 right-24 z-[100] flex flex-col gap-12">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
