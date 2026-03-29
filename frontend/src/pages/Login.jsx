import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, bypassLogin } from '../api/auth'
import { toast } from '../components/ui/Toast'
import CustomCursor from '../components/ui/CustomCursor'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      await login(formData)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || 'Login failed. Please try again.')
      setErrors({ password: 'Invalid email or password' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBypass = () => {
    bypassLogin()
    toast.success('Testing bypass enabled')
    navigate('/dashboard')
  }

  return (
    <div className="bg-surface min-h-screen overflow-hidden text-on-surface">
      <CustomCursor />

      <main className="flex min-h-screen w-full flex-col lg:flex-row">
        <section className="hidden lg:flex lg:w-1/2 bg-[#18170F] relative flex-col justify-between p-10 xl:p-12 overflow-hidden">
          <div className="absolute inset-0 noise-overlay pointer-events-none opacity-100" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />

          <div className="relative z-10">
            <span className="text-[18px] font-bold tracking-tight text-[#EDE9E0]">Sketchroom</span>
          </div>

          <div className="relative z-10 max-w-md">
            <h1 className="text-[36px] font-light leading-[1.2] text-[#EDE9E0] mb-12">
              Where ideas find
              <br />
              their form.
            </h1>

            <nav className="space-y-4">
              {['Decision Board', 'Editorial Pipeline', 'Curated Archives'].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[#EDE9E0]/60 group cursor-pointer hover:text-[#EDE9E0] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                  <span className="text-[14px] font-medium tracking-tight">{item}</span>
                </div>
              ))}
            </nav>
          </div>

          <div className="relative z-10 text-[10px] uppercase tracking-[0.2em] text-[#EDE9E0]/40 font-semibold space-y-1">
            <p>Sketchroom Editorial System</p>
            <p>Build 0.9.4 - Production</p>
          </div>
        </section>

        <section className="w-full lg:w-1/2 bg-[#F2EEE6] relative flex items-center justify-center p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="absolute inset-0 dot-grid pointer-events-none opacity-[0.04]" />

          <div className="w-full max-w-[520px] xl:max-w-[560px] z-10">
            <div className="lg:hidden mb-8 sm:mb-10 flex justify-center">
              <span className="text-[20px] font-black tracking-tighter text-on-surface">SKETCHROOM</span>
            </div>

            <div className="bg-[#FEFCF8] border border-[#18170F]/10 rounded-[10px] p-6 sm:p-8 lg:p-10 xl:p-12 shadow-[0_30px_60px_rgba(24,23,15,0.03)]">
              <header className="mb-8 sm:mb-10">
                <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#18170F] tracking-tight">Sign in</h2>
                <p className="text-[13px] sm:text-[14px] text-[#18170F]/60 mt-1">Access your editorial workspace.</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A09890]" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@studio.com"
                    className="w-full h-[48px] px-4 bg-[#F2EEE6]/30 border border-[#18170F]/5 focus:border-primary/30 focus:ring-0 rounded-[4px] text-[14px] transition-all placeholder:text-[#18170F]/20"
                  />
                  {errors.email && <p className="text-[11px] text-error pt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A09890]" htmlFor="password">
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
                      className="w-full h-[48px] px-4 bg-[#F2EEE6]/30 border border-[#18170F]/5 focus:border-primary/30 focus:ring-0 rounded-[4px] text-[14px] transition-all placeholder:text-[#18170F]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#18170F]/30 hover:text-[#18170F] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-error pt-1">{errors.password}</p>}
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[46px] bg-primary-container text-white text-[13px] font-medium tracking-tight rounded-[4px] hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
                  >
                    {isLoading ? 'Signing in...' : 'Continue'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBypass}
                    className="w-full h-[46px] border border-[#18170F]/10 text-[#18170F] text-[12px] font-medium tracking-tight rounded-[4px] hover:bg-[#F2EEE6] transition-all duration-300"
                  >
                    Bypass for frontend testing
                  </button>
                </div>

                <div className="pt-4 text-center">
                  <a className="text-[12px] text-[#18170F]/40 hover:text-primary transition-colors" href="#">
                    Forgot password?
                  </a>
                </div>
              </form>
            </div>

            <div className="mt-7 sm:mt-8 text-center">
              <p className="text-[13px] sm:text-[14px] text-[#18170F]/60">
                New to the system?
                <Link
                  to="/signup"
                  className="text-[#18170F] font-semibold hover:text-primary transition-colors ml-1 underline underline-offset-4 decoration-[#18170F]/10"
                >
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-20 pointer-events-none">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 w-full px-5 sm:px-8 py-5 sm:py-8">
          <div className="opacity-0 lg:opacity-100" />
          <div className="flex gap-4 sm:gap-8 pointer-events-auto flex-wrap justify-center">
            <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-stone-500 hover:text-orange-600 transition-colors cursor-pointer">Privacy</span>
            <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-stone-500 hover:text-orange-600 transition-colors cursor-pointer">Terms</span>
            <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-stone-500 hover:text-orange-600 transition-colors cursor-pointer">Colophon</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Login
