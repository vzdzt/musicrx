
// Theme Effects Animations
const themeEffects = {
  initializeAnimations() {
    // Only initialize animations if elements exist
    const hasElements = (selector) => document.querySelectorAll(selector).length > 0;

    if (hasElements('.pulse-element')) this.setupPulseAnimation();
    if (hasElements('.heatwave-element')) this.setupHeatwaveAnimation();
    if (hasElements('.wave-element')) this.setupWaveAnimation();
    if (hasElements('.neon-element')) this.setupNeonFlickerAnimation();
    if (hasElements('.void-element')) this.setupVoidPulseAnimation();
    if (hasElements('.inferno-element')) this.setupInfernoGlowAnimation();
    if (hasElements('.rift-element')) this.setupRiftSwirlAnimation();
    if (hasElements('.eclipse-element')) this.setupEclipsePulseAnimation();
    if (hasElements('.flux-element')) this.setupFluxShiftAnimation();
    if (hasElements('.spectral-element')) this.setupSpectralWaveAnimation();
    if (hasElements('.mirage-element')) this.setupMirageAnimation();
    if (hasElements('.aurora-element')) this.setupAuroraFlowAnimation();
    if (hasElements('.nebula-element')) this.setupNebulaSwirlAnimation();
  },

  setupPulseAnimation() {
    gsap.to('.pulse-element', {
      opacity: 0.8,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  },

  setupHeatwaveAnimation() {
    gsap.to('.heatwave-element', {
      scale: 1.02,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });
  },

  setupWaveAnimation() {
    gsap.to('.wave-element', {
      backgroundPosition: '100% 100%',
      duration: 10,
      repeat: -1,
      ease: "none"
    });
  },

  setupNeonFlickerAnimation() {
    gsap.to('.neon-element', {
      opacity: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: -1,
      ease: "steps(1)"
    });
  },

  setupVoidPulseAnimation() {
    gsap.to('.void-element', {
      filter: 'brightness(1.2)',
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  },

  setupInfernoGlowAnimation() {
    gsap.to('.inferno-element', {
      filter: 'brightness(1.3)',
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut"
    });
  },

  setupRiftSwirlAnimation() {
    gsap.to('.rift-element', {
      rotate: 360,
      duration: 20,
      repeat: -1,
      ease: "none"
    });
  },

  setupEclipsePulseAnimation() {
    gsap.to('.eclipse-element', {
      filter: 'brightness(0.9)',
      scale: 1.03,
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  },

  setupFluxShiftAnimation() {
    gsap.to('.flux-element', {
      backgroundPosition: '100% 100%',
      filter: 'brightness(1.2)',
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });
  },

  setupSpectralWaveAnimation() {
    gsap.to('.spectral-element', {
      backgroundPosition: '100% 100%',
      y: -5,
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  },

  setupMirageAnimation() {
    gsap.to('.mirage-element', {
      filter: 'blur(2px)',
      duration: 5,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  },

  setupAuroraFlowAnimation() {
    gsap.to('.aurora-element', {
      backgroundPosition: '100% 100%',
      duration: 8,
      repeat: -1,
      ease: "none"
    });
  },

  setupNebulaSwirlAnimation() {
    gsap.to('.nebula-element', {
      backgroundPosition: '100% 100%',
      scale: 1.02,
      duration: 15,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });
  }
};

// Initialize all animations when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  themeEffects.initializeAnimations();
});

