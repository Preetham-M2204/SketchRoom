import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import CustomCursor from '../components/ui/CustomCursor'

gsap.registerPlugin(ScrollTrigger)

const modeCards = [
  {
    icon: 'account_tree',
    title: 'Decision Board',
    description: 'Turn chaotic ideas into structured outcomes with voting and weighted scales.',
    label: 'Strategic',
  },
  {
    icon: 'forum',
    title: 'Focus Meeting',
    description: 'Minimalist canvas layout designed to keep the conversation on the main agenda.',
    label: 'Interactive',
  },
  {
    icon: 'groups_3',
    title: 'GD Round',
    description: 'Rapid-fire ideation sprints for collective brainstorming without friction.',
    label: 'Exploratory',
  },
  {
    icon: 'draw',
    title: 'Free Canvas',
    description: 'The ultimate open playground for uninhibited sketching and wireframing.',
    label: 'Creative',
  },
]

const Landing = () => {
  const pageRef = useRef(null)

  useEffect(() => {
    const page = pageRef.current
    document.title = 'Sketchroom | Think Together'

    const magneticCleanups = []
    let lenis

    if (page) {
      page.querySelectorAll('.magnetic-wrap').forEach((wrap) => {
        const button = wrap.firstElementChild
        if (!button) return

        const moveHandler = (event) => {
          const rect = wrap.getBoundingClientRect()
          const x = event.clientX - rect.left - rect.width / 2
          const y = event.clientY - rect.top - rect.height / 2

          gsap.to(button, {
            x: x * 0.22,
            y: y * 0.22,
            duration: 0.45,
            ease: 'power3.out',
          })
        }

        const leaveHandler = () => {
          gsap.to(button, {
            x: 0,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
          })
        }

        wrap.addEventListener('mousemove', moveHandler)
        wrap.addEventListener('mouseleave', leaveHandler)
        magneticCleanups.push(() => {
          wrap.removeEventListener('mousemove', moveHandler)
          wrap.removeEventListener('mouseleave', leaveHandler)
        })
      })

      lenis = new Lenis({
        duration: 1.8,
        lerp: 0.085,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        smoothWheel: true,
        wheelMultiplier: 0.85,
      })

      lenis.on('scroll', ScrollTrigger.update)

      const updateLenis = (time) => {
        lenis.raf(time * 1000)
      }

      gsap.ticker.add(updateLenis)
      gsap.ticker.lagSmoothing(0)
      magneticCleanups.push(() => {
        gsap.ticker.remove(updateLenis)
      })
    }

    const ctx = gsap.context(() => {
      gsap.to('.hero-reveal-1', {
        opacity: 1,
        y: 0,
        duration: 1.6,
        ease: 'power3.out',
        delay: 0.15,
      })

      gsap.to('.hero-reveal-2', {
        opacity: 1,
        y: 0,
        duration: 1.6,
        ease: 'power3.out',
        delay: 0.32,
      })

      gsap.to('.canvas-reveal', {
        scrollTrigger: {
          trigger: '.canvas-reveal',
          start: 'top 82%',
        },
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: 'power2.out',
      })

      gsap.from('.landing-card', {
        scrollTrigger: {
          trigger: '#modes',
          start: 'top 72%',
        },
        y: 26,
        opacity: 0,
        duration: 1,
        stagger: 0.14,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      })
    }, pageRef)

    return () => {
      magneticCleanups.forEach((cleanup) => cleanup())
      ctx.revert()
      if (lenis) {
        lenis.destroy()
      }
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [])

  return (
    <div ref={pageRef} className="min-h-screen bg-[#F2EEE6] font-body text-on-surface overflow-x-hidden">
      <CustomCursor hoverSelector="button, a, .landing-card, .cursor-hover" />

      <nav className="h-[52px] w-full fixed top-0 z-50 flex justify-between items-center px-4 sm:px-6 lg:px-8 bg-transparent backdrop-blur-xl">
        <div className="text-[15px] font-bold tracking-[-0.05em] text-[#18170F]">Sketchroom</div>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex gap-8 text-[12px] font-medium uppercase tracking-wider text-[#18170F]">
            <a className="hover:text-[#D4420A] transition-colors duration-300" href="#canvas-preview">Product</a>
            <a className="hover:text-[#D4420A] transition-colors duration-300" href="#social-proof">Journal</a>
            <a className="hover:text-[#D4420A] transition-colors duration-300" href="#footer">Pricing</a>
          </div>
          <div className="magnetic-wrap">
            <Link
              to="/login"
              className="bg-[#18170F] text-[#F2EEE6] text-[10px] px-5 py-2.5 rounded-lg uppercase font-bold tracking-tight hover:bg-[#D4420A] transition-all duration-300 transform hover:scale-105 inline-block"
            >
              Open room
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-[52px]">
        <section className="relative min-h-[72vh] sm:min-h-[820px] flex flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-8" id="hero">
          <div className="w-full">
            <h1 className="font-headline font-extrabold leading-[0.85] tracking-[-0.05em] select-none">
              <span className="block hollow-text text-[clamp(72px,16vw,220px)] opacity-0 translate-y-16 hero-reveal-1">
                THINK
              </span>
              <span className="block text-on-surface text-[clamp(72px,16vw,220px)] ml-[18%] sm:ml-[28%] lg:ml-[35%] -mt-[0.2em] opacity-0 translate-y-16 hero-reveal-2">
                TOGETHER.
              </span>
            </h1>
          </div>
        </section>

        <section className="border-y border-[#18170F]/10 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 items-center">
            <div className="md:pr-12 md:border-r border-[#18170F]/10">
              <p className="text-[13px] leading-relaxed text-[#6A6558] max-w-[240px]">
                A collaborative workspace for every kind of thinking. Built for designers, thinkers, and builders.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 px-0 sm:px-8 md:border-r border-[#18170F]/10">
              <div className="magnetic-wrap">
                <Link
                  to="/signup"
                  className="btn-primary-gradient text-white text-[11px] px-8 py-3.5 rounded-lg uppercase font-bold tracking-wider inline-block"
                >
                  Start a room
                </Link>
              </div>
              <div className="magnetic-wrap">
                <a
                  href="#modes"
                  className="border border-[#18170F]/20 text-[#18170F] text-[11px] px-8 py-3.5 rounded-lg uppercase font-bold tracking-wider hover:bg-[#18170F] hover:text-white transition-colors inline-block"
                >
                  See the modes
                </a>
              </div>
            </div>

            <div className="md:pl-12 text-right md:text-left">
              <p className="text-[13px] font-medium leading-relaxed uppercase tracking-tighter text-[#18170F]">
                Four modes. One canvas.
                <br />
                Built for real collaboration.
              </p>
            </div>
          </div>
        </section>

        <section id="canvas-preview" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-screen-2xl mx-auto perspective-container opacity-0 translate-y-10 canvas-reveal">
            <div className="tilt-card bg-surface-container-lowest rounded-xl shadow-[0_30px_60px_rgba(24,23,15,0.05)] border border-[#18170F]/5 overflow-hidden">
              <div className="bg-[#EFEFEB] h-10 flex items-center px-4 gap-6 border-b border-[#18170F]/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 max-w-md bg-white/60 rounded py-1 px-3 text-[11px] font-mono text-[#6A6558]">
                  sketchroom.app/r/product-roadmap
                </div>
              </div>

              <div className="h-[55vw] max-h-[640px] bg-[#F7F4EF] canvas-grid relative overflow-hidden">
                <div className="absolute top-24 left-32 w-48 h-48 bg-[#FFF9C4] p-4 shadow-sm rotate-[-2deg] flex flex-col justify-between">
                  <p className="text-[14px] leading-tight font-medium">Define core user personas for Q3 launch</p>
                  <span className="text-[10px] uppercase font-bold text-black/40">Jordan • 2m ago</span>
                </div>

                <div className="absolute top-40 left-[28%] w-48 h-48 bg-[#E1F5FE] p-4 shadow-sm rotate-[3deg] flex flex-col justify-between">
                  <p className="text-[14px] leading-tight font-medium">Finalize color palette for dark mode experience</p>
                  <span className="text-[10px] uppercase font-bold text-black/40">Sarah • Just now</span>
                </div>

                <div className="absolute top-20 left-[50%] w-64 h-48 bg-white p-6 shadow-xl border border-[#D4420A]/10 rounded-lg">
                  <h4 className="text-[11px] font-bold uppercase text-[#D4420A] mb-2">Decision Board</h4>
                  <p className="text-[15px] leading-snug">
                    The canvas architecture should favor spatial memory over linear lists.
                  </p>
                </div>

                <div className="absolute top-[60%] left-[40%] flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[#D4420A] text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    near_me
                  </span>
                  <div className="bg-[#D4420A] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">MARCUS</div>
                </div>

                <div className="absolute top-[45%] left-[70%] flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[#1E5F74] text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    near_me
                  </span>
                  <div className="bg-[#1E5F74] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ALEXA</div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#18170F] text-white px-4 py-2 rounded-full flex gap-6 items-center shadow-2xl">
                  <span className="material-symbols-outlined text-[20px] opacity-60 hover:opacity-100 cursor-pointer">pan_tool</span>
                  <span
                    className="material-symbols-outlined text-[20px] text-[#D4420A]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    edit
                  </span>
                  <span className="material-symbols-outlined text-[20px] opacity-60 hover:opacity-100 cursor-pointer">sticky_note_2</span>
                  <span className="material-symbols-outlined text-[20px] opacity-60 hover:opacity-100 cursor-pointer">photo_library</span>
                  <div className="w-[1px] h-4 bg-white/20" />
                  <span className="material-symbols-outlined text-[20px] opacity-60 hover:opacity-100 cursor-pointer">more_horiz</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modes" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-surface-container-low">
          <div className="max-w-screen-2xl mx-auto">
            <div className="mb-20">
              <h2 className="text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.1] tracking-tighter">
                <span className="block font-light text-[#6A6558]">Four modes.</span>
                <span className="block font-bold text-on-surface">Every kind of thinking.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modeCards.map((card) => (
                <div
                  key={card.title}
                  className="landing-card bg-surface-container-lowest p-8 rounded-lg border border-[#18170F]/5 hover:-translate-y-2 transition-transform duration-500 group"
                >
                  <div className="mb-12">
                    <span className="material-symbols-outlined text-[32px] text-[#D4420A] group-hover:scale-110 transition-transform duration-300">
                      {card.icon}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold mb-2">{card.title}</h3>
                  <p className="text-[13px] text-[#6A6558] mb-8 leading-relaxed">{card.description}</p>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#18170F]/40">{card.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-marquee-section py-16 md:py-20 bg-[#18170F] overflow-hidden flex flex-col gap-5">
          <div className="marquee-container">
            <div className="marquee-content marquee-track flex gap-8 py-1">
              <span className="marquee-text text-[#EDE9E0] shrink-0">
                Decision Board • Think Together • No Limits • Decision Board • Think Together • No Limits •
              </span>
              <span className="marquee-text text-[#EDE9E0] shrink-0">
                Decision Board • Think Together • No Limits • Decision Board • Think Together • No Limits •
              </span>
            </div>
          </div>
          <div className="marquee-container">
            <div className="marquee-content-reverse marquee-track flex gap-8 py-1">
              <span className="marquee-text text-[#D4420A] shrink-0">
                Collaborate Fast • Build Better • Design Systems • Collaborate Fast • Build Better • Design Systems •
              </span>
              <span className="marquee-text text-[#D4420A] shrink-0">
                Collaborate Fast • Build Better • Design Systems • Collaborate Fast • Build Better • Design Systems •
              </span>
            </div>
          </div>
        </section>

        <section id="social-proof" className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <blockquote className="max-w-4xl mb-12">
            <p className="text-[26px] sm:text-[32px] lg:text-[40px] font-light leading-snug tracking-tight text-on-surface italic">
              <span className="text-[#D4420A] text-[56px] font-serif not-italic">“</span>{' '}
              Sketchroom replaced three of our tools in a single week. It&apos;s the first digital space that feels as natural as a physical whiteboard.
            </p>
            <cite className="block mt-6 font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.18em] text-[#18170F]">
              Elena Rodriguez • Product Lead at Velo
            </cite>
          </blockquote>
        </section>
      </main>

      <footer id="footer" className="min-h-[48px] w-full border-t border-[#18170F]/10 bg-[#F2EEE6] z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 py-3 w-full max-w-screen-2xl mx-auto min-h-[48px]">
          <div className="text-[14px] font-bold tracking-[-0.05em] text-[#18170F]">Sketchroom</div>
          <div className="font-['Inter'] text-[10px] tracking-[0.1em] uppercase text-[#18170F]/60">
            Built with React + Node.js
          </div>
          <div className="flex items-center gap-4">
            <a className="text-[#18170F]/60 hover:text-[#D4420A] transition-opacity" href="https://github.com" aria-label="GitHub">
              <img
                className="w-4 h-4 opacity-60"
                alt="Github icon logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0EYrKn5WFjCAzHiSC_1OgjdYIkoTrkWOBYYqZVigh5qS3lCeHIO2RsV2R_hk8Wbns1ZJPcvEk2hr2hGbkIYPqqW9RtD2WxLaH9DZAj36RnHjuj3pqyYWlxwwHkYVpl8wYjZOr4ksUwbQKkdGoGbFHabBOp4g7zMkmYIZGAofBqUe74hobw0Nqviz2oPwk-uzN4pMQoya77j-C4OaFgsDrHCadWpTIzWecyEEQv4mH9WnDr1LIKO9K3jiH4lJESkFdIEo9GWh-Y1xz"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
