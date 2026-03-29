import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Modal Component
 * Overlay modal with backdrop, animations, and keyboard support
 *
 * Props:
 * - isOpen: Show/hide modal
 * - onClose: Close handler (called when backdrop clicked or ESC pressed)
 * - title: Modal title
 * - children: Modal content
 * - size: 'sm' | 'md' | 'lg' | 'xl'
 * - showCloseButton: Show X button in top-right
 * - closeOnBackdrop: Allow closing by clicking backdrop (default: true)
 * - closeOnEsc: Allow closing with ESC key (default: true)
 *
 * Example:
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Room">
 *   <p>Modal content here</p>
 * </Modal>
 */

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = '',
}) => {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, closeOnEsc])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Size mapping
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-16">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`
              relative w-full ${sizes[size]}
              bg-bg-light rounded-card
              shadow-2xl
              max-h-[90vh] overflow-y-auto
              ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-24 py-20 border-b border-border-light">
              <h2 className="text-20 font-semibold text-text-primary">
                {title}
              </h2>

              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-8 rounded-button hover:bg-surface-container-low transition-colors text-text-secondary hover:text-text-primary"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-24 py-20">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
