import { create } from 'zustand'

const useAuthStore = create((set) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,

  // Actions
  login: (userData, authToken) => set({
    user: userData,
    token: authToken,
    isAuthenticated: true,
  }),

  logout: () => set({
    user: null,
    token: null,
    isAuthenticated: false,
  }),

  updateUser: (userData) => set((state) => ({
    user: { ...state.user, ...userData },
  })),
}))

export default useAuthStore
