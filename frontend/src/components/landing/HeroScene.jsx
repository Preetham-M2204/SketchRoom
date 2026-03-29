import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'

/**
 * HeroScene Component
 * 3D scene for landing page hero section using React Three Fiber
 *
 * What it displays:
 * - Floating grid background
 * - Animated 3D box that rotates
 * - Subtle camera movement
 * - Responsive canvas
 *
 * Tech stack:
 * - @react-three/fiber: React wrapper for Three.js
 * - @react-three/drei: Helper components (Grid, OrbitControls)
 * - Three.js: 3D rendering engine
 */

// Animated rotating box
function RotatingBox() {
  const meshRef = useRef()

  // Rotate on every frame (60fps)
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#D4420A"
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  )
}

// Floating sphere
function FloatingSphere({ position }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#1E5F74"
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

const HeroScene = () => {
  return (
    <div className="w-full h-[600px] relative">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        className="bg-transparent"
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#D4420A" />

        {/* Grid */}
        <Grid
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={3}
          sectionThickness={1}
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          position={[0, -0.5, 0]}
          args={[20, 20]}
        />

        {/* 3D Objects */}
        <RotatingBox />
        <FloatingSphere position={[-2, 1, 0]} />
        <FloatingSphere position={[2, 1.5, -1]} />

        {/* Camera controls (optional, remove for fixed camera) */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  )
}

export default HeroScene
