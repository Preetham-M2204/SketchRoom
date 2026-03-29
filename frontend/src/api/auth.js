import api from './axios'
import useAuthStore from '../stores/useAuthStore'

/**
 * Sign up a new user
 * @param {Object} userData - { name, email, password }
 * @returns {Promise<Object>} { user, token }
 */
export const signup = async (userData) => {
  try {
    const response = await api.post('/auth/signup', userData)
    const { user, token } = response.data

    // Store in Zustand
    useAuthStore.getState().login(user, token)

    return { user, token }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Signup failed')
  }
}

/**
 * Login existing user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { user, token }
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials)
    const { user, token } = response.data

    // Store in Zustand
    useAuthStore.getState().login(user, token)

    return { user, token }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed')
  }
}

/**
 * Logout user (client-side only, no API call needed)
 */
export const logout = () => {
  useAuthStore.getState().logout()
}

/**
 * Temporary frontend-only bypass for UI testing
 */
export const bypassLogin = () => {
  const mockUser = {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@sketchroom.local',
  }

  useAuthStore.getState().login(mockUser, 'frontend-bypass-token')
  return mockUser
}
