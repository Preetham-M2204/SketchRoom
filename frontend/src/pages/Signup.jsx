import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signup, bypassLogin } from '../api/auth'
import { toast } from '../components/ui/Toast'
import CustomCursor from '../components/ui/CustomCursor'

const Signup = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/dashboard'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const getPasswordStrength = () => {
    const { password } = formData
    if (!password) return null
    if (password.length < 6) return 'Weak: Add symbols or numbers'
    if (password.length < 10 && !/[0-9]/.test(password)) return 'Medium: Add numbers'
    return 'Strong'
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      toast.success('Account created successfully!')
      navigate(redirectPath)
    } catch (error) {
      toast.error(error.message || 'Signup failed. Please try again.')
      if (error.message?.includes('email')) {
        setErrors({ email: 'This email is already registered' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBypass = () => {
    bypassLogin()
    toast.success('Testing bypass enabled')
    navigate(redirectPath)
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-x-hidden min-h-screen">
      <CustomCursor />

      <main className="min-h-screen flex flex-col md:flex-row">
        <section className="relative w-full md:w-1/2 min-h-[360px] md:min-h-screen flex items-center justify-center bg-on-surface p-8 sm:p-10 lg:p-12 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Abstract editorial stone texture"
              className="w-full h-full object-cover opacity-45 grayscale"
              src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/35 to-black/10" />
          </div>

          <div className="relative z-10 max-w-lg w-full">
            <div className="mb-8">
              <span className="text-[#F7D5C8] uppercase tracking-[0.2em] text-[10px] font-medium">Volume 01 - Edition 24</span>
              <h1 className="text-white text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.85] mt-4">
                SKETCH
                <br />
                ROOM
              </h1>
            </div>

            <p className="text-white/88 text-base sm:text-lg leading-relaxed max-w-sm">
              A curated digital archive for the intentional collector. Documenting the essence of form and function.
            </p>

            <div className="mt-16 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-[#F7D5C8]" />
              <span className="text-white/90 text-[11px] uppercase tracking-widest">Est. MMXXIV</span>
            </div>
          </div>
        </section>

        <section className="relative w-full md:w-1/2 min-h-screen flex flex-col items-center justify-center p-5 sm:p-8 lg:p-16 xl:p-20 bg-[#F2EEE6]">
          <div className="absolute inset-0 dot-grid pointer-events-none" />

          <div className="relative z-10 w-full max-w-[560px]">
            <div className="bg-[#FEFCF8]/96 border border-[#18170F]/10 rounded-[12px] shadow-[0_32px_80px_rgba(24,23,15,0.06)] p-6 sm:p-8 lg:p-10">
            <div className="mb-10 text-left">
              <h2 className="text-on-surface text-4xl font-extrabold tracking-tight mb-2">Create account</h2>
              <p className="text-on-surface-variant text-sm">Enter your details to begin your collection.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold" htmlFor="name">
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  className="w-full bg-surface-container-lowest border-none py-4 px-5 text-sm ring-1 ring-inset ring-outline-variant/30 focus:ring-2 focus:ring-primary outline-none transition-all duration-300"
                />
                {errors.name && <p className="text-[11px] text-error pt-1">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@sketchroom.com"
                  className="w-full bg-surface-container-lowest border-none py-4 px-5 text-sm ring-1 ring-inset ring-outline-variant/30 focus:ring-2 focus:ring-primary outline-none transition-all duration-300"
                />
                {errors.email && <p className="text-[11px] text-error pt-1">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest border-none py-4 px-5 text-sm ring-1 ring-inset ring-outline-variant/30 focus:ring-2 focus:ring-primary outline-none transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                <div className="pt-2 flex gap-1.5">
                  <div className="h-[2px] w-full bg-[#C0392B] rounded-full" />
                  <div className={`h-[2px] w-full rounded-full ${formData.password.length >= 6 ? 'bg-[#C4871A]' : 'bg-[#C4871A]/30'}`} />
                  <div className={`h-[2px] w-full rounded-full ${formData.password.length >= 10 ? 'bg-[#2A7A4B]' : 'bg-[#2A7A4B]/30'}`} />
                  <div className="h-[2px] w-full bg-outline-variant/20 rounded-full" />
                </div>
                {getPasswordStrength() && (
                  <p className="text-[10px] text-on-surface-variant font-medium mt-1">{getPasswordStrength()}</p>
                )}
                {errors.password && <p className="text-[11px] text-error pt-1">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full bg-primary py-5 px-8 flex items-center justify-center gap-3 overflow-hidden transition-all duration-500 hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
              >
                <span className="relative z-10 text-white text-[12px] uppercase tracking-[0.2em] font-bold">
                  {isLoading ? 'Creating...' : 'Create account'}
                </span>
                {!isLoading && (
                  <span className="material-symbols-outlined text-white text-[18px] relative z-10 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBypass}
                className="w-full border border-[#18170F]/10 py-4 px-5 text-[12px] uppercase tracking-[0.18em] font-bold text-on-surface hover:bg-surface-container transition-all duration-300 rounded-[6px]"
              >
                Bypass for frontend testing
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-on-surface-variant text-xs">
                Already have an account?
                <Link to="/login" className="text-on-surface font-bold underline underline-offset-4 hover:text-primary transition-colors ml-1">
                  Sign in
                </Link>
              </p>
            </div>
            </div>
          </div>

          <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-0 w-full px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row justify-between items-center gap-2 opacity-40">
            <span className="text-[9px] uppercase tracking-widest text-on-surface">Verification Secure 256-bit</span>
            <span className="text-[9px] uppercase tracking-widest text-on-surface">(c) 2024 Sketchroom</span>
          </div>
        </section>
      </main>

      <div className="fixed top-5 right-5 sm:top-8 sm:right-8 z-50 mix-blend-difference pointer-events-none hidden md:block">
        <span className="text-surface text-[12px] font-bold tracking-widest editorial-stroke">EN - US</span>
      </div>
    </div>
  )
}

export default Signup
