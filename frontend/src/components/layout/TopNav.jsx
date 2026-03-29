import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, User } from 'lucide-react'
import useAuthStore from '../../stores/useAuthStore'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { useState, useRef, useEffect } from 'react'

/**
 * TopNav Component
 * Main navigation bar for authenticated pages (Dashboard, etc.)
 *
 * Features:
 * - Logo with link to dashboard
 * - User profile dropdown
 * - Logout functionality
 * - Responsive design
 */

const TopNav = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-bg-light/80 backdrop-blur-md border-b border-border-light">
      <div className="max-w-7xl mx-auto px-24 py-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="text-24 font-semibold text-text-primary hover:text-vermillion transition-colors"
        >
          Sketchroom
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-24">
          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-12 hover:opacity-80 transition-opacity"
            >
              <Avatar user={user} size="sm" showBorder />
              <div className="hidden md:block text-left">
                <div className="text-14 font-medium text-text-primary">
                  {user?.name || 'User'}
                </div>
                <div className="text-12 text-text-tertiary">
                  {user?.email || ''}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-8 w-200 bg-surface-bright rounded-card border border-border-light shadow-xl py-8">
                <Link
                  to="/profile"
                  className="flex items-center gap-12 px-16 py-12 hover:bg-surface-container-low transition-colors text-14 text-text-primary"
                  onClick={() => setShowDropdown(false)}
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-12 px-16 py-12 hover:bg-surface-container-low transition-colors text-14 text-text-primary"
                  onClick={() => setShowDropdown(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>

                <div className="h-1 bg-border-light my-8" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-12 px-16 py-12 hover:bg-surface-container-low transition-colors text-14 text-vermillion"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNav
