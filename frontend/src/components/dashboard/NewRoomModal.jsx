import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../../api/rooms'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import ModeSelector from './ModeSelector'
import { toast } from '../ui/Toast'
import { ArrowRight, ArrowLeft } from 'lucide-react'

/**
 * NewRoomModal Component
 * Two-step modal for creating a new room
 *
 * Step 1: Select mode (Decision, Meeting, GD, Canvas)
 * Step 2: Room details (name, topic, public access)
 *
 * Features:
 * - Multi-step form with back button
 * - Form validation
 * - Loading states
 * - Redirect to room after creation
 */

const NewRoomModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedMode, setSelectedMode] = useState('decision')
  const [formData, setFormData] = useState({
    name: '',
    topic: '',
    isPublic: true,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep2 = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Room name must be at least 3 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Room name must be less than 50 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setErrors({})
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateStep2()) return

    setIsLoading(true)

    try {
      const room = await createRoom({
        name: formData.name,
        mode: selectedMode,
        topic: formData.topic || undefined,
        access: formData.isPublic ? 'public' : 'private',
        modeConfig: {}, // Default config for now
      })

      toast.success('Room created successfully!')
      onClose()
      navigate(`/room/${room.id}`)
    } catch (error) {
      toast.error(error.message || 'Failed to create room')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedMode('decision')
    setFormData({ name: '', topic: '', isPublic: true })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Choose a mode' : 'Room details'}
      size="lg"
    >
      {step === 1 && (
        <div>
          {/* Mode Selector */}
          <ModeSelector selectedMode={selectedMode} onSelect={setSelectedMode} />

          {/* Next Button */}
          <div className="mt-32 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-24">
            {/* Room Name */}
            <Input
              label="Room name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="e.g., Q4 Strategy Planning"
              required
              autoFocus
            />

            {/* Topic (Optional) */}
            <Input
              label="Topic (optional)"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="What will you be discussing?"
            />

            {/* Public Access Toggle */}
            <div className="flex items-center justify-between p-16 bg-surface-container-low rounded-card">
              <div>
                <div className="text-15 font-medium text-text-primary mb-4">
                  Public access
                </div>
                <div className="text-13 text-text-secondary">
                  Anyone with the link can join
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-44 h-24 bg-surface-container-high peer-focus:ring-2 peer-focus:ring-vermillion rounded-pill peer peer-checked:after:translate-x-20 peer-checked:after:bg-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-16 after:w-16 after:transition-all peer-checked:bg-vermillion"></div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-32 flex items-center justify-between gap-16">
            <Button
              variant="ghost"
              size="md"
              onClick={handleBack}
              icon={<ArrowLeft size={16} />}
              iconPosition="left"
            >
              Back
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Create room
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default NewRoomModal
