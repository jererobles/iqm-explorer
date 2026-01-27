import { useMemo } from 'react'
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
  HueSaturation,
} from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import { Vector2 } from 'three'

interface QuantumPostProcessingProps {
  bloomIntensity?: number
  bloomThreshold?: number
  chromaticAberration?: number
  vignetteIntensity?: number
  noiseIntensity?: number
  saturation?: number
}

export function QuantumPostProcessing({
  bloomIntensity = 1.5,
  bloomThreshold = 0.4,
  chromaticAberration = 0.002,
  vignetteIntensity = 0.4,
  noiseIntensity = 0.05,
  saturation = 0.1,
}: QuantumPostProcessingProps) {
  // Memoize Vector2 to prevent recreation on every render
  const chromaticOffset = useMemo(
    () => new Vector2(chromaticAberration, chromaticAberration),
    [chromaticAberration]
  )

  return (
    <EffectComposer multisampling={4}>
      {/* Bloom for glowing effects */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />

      {/* Chromatic aberration for sci-fi look */}
      <ChromaticAberration
        offset={chromaticOffset}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />

      {/* Vignette for focus */}
      <Vignette
        offset={0.3}
        darkness={vignetteIntensity}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* Subtle noise for organic feel */}
      <Noise
        opacity={noiseIntensity}
        blendFunction={BlendFunction.OVERLAY}
      />

      {/* Slightly boost saturation */}
      <HueSaturation
        saturation={saturation}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

// Lighter post-processing for better performance
export function QuantumPostProcessingLight({
  bloomIntensity = 1.2,
  bloomThreshold = 0.5,
  vignetteIntensity = 0.3,
}: {
  bloomIntensity?: number
  bloomThreshold?: number
  vignetteIntensity?: number
}) {
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.MEDIUM}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={vignetteIntensity}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

// Dynamic bloom that responds to quantum state
export function AdaptiveQuantumEffects({
  quantumIntensity = 0.5,
  isEntangled = false,
  isSuperposition = false,
}: {
  quantumIntensity?: number
  isEntangled?: boolean
  isSuperposition?: boolean
}) {
  // Adjust bloom based on quantum state
  const bloomIntensity = useMemo(() => {
    let base = 1.0
    if (isEntangled) base += 0.5
    if (isSuperposition) base += 0.3
    return base * quantumIntensity + 0.8
  }, [quantumIntensity, isEntangled, isSuperposition])

  // Memoize Vector2 to prevent recreation on every render
  const chromaticOffsetVec = useMemo(() => {
    let base = 0.001
    if (isEntangled) base += 0.002
    return new Vector2(base, base)
  }, [isEntangled])

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />

      <ChromaticAberration
        offset={chromaticOffsetVec}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />

      <Vignette
        offset={0.25}
        darkness={0.4}
        blendFunction={BlendFunction.NORMAL}
      />

      <Noise
        opacity={isEntangled ? 0.08 : 0}
        blendFunction={BlendFunction.OVERLAY}
      />

      <HueSaturation
        saturation={isSuperposition ? 0.2 : 0.1}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
