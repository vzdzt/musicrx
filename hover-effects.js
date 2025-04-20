
// Hover Effects
const hoverEffects = {
  init() {
    this.setupGlowHover();
    this.setupRgbShiftHover();
    this.setupPrismShiftHover();
    this.setupHoloShiftHover();
  },

  setupGlowHover() {
    const glowElements = document.querySelectorAll('.glow-hover');
    glowElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, {
          boxShadow: '0 0 20px var(--glow)',
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out"
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          boxShadow: '0 0 0 transparent',
          scale: 1,
          duration: 0.3,
          ease: "power2.in"
        });
      });
    });
  },

  setupRgbShiftHover() {
    const rgbElements = document.querySelectorAll('.rgb-shift-hover');
    rgbElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, {
          backgroundSize: '200% 200%',
          duration: 0.3,
          ease: "none"
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          backgroundSize: '100% 100%',
          duration: 0.3,
          ease: "none"
        });
      });
    });
  },

  setupPrismShiftHover() {
    const prismElements = document.querySelectorAll('.prism-shift-hover');
    prismElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, {
          x: 5,
          backgroundPosition: '100% 100%',
          duration: 0.3,
          ease: "power1.out"
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          x: 0,
          backgroundPosition: '0% 0%',
          duration: 0.3,
          ease: "power1.in"
        });
      });
    });
  },

  setupHoloShiftHover() {
    const holoElements = document.querySelectorAll('.holo-shift-hover');
    holoElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, {
          rotate: 2,
          backgroundPosition: '100% 100%',
          duration: 0.3,
          ease: "power1.out"
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          rotate: 0,
          backgroundPosition: '0% 0%',
          duration: 0.3,
          ease: "power1.in"
        });
      });
    });
  }
};

// Initialize hover effects
document.addEventListener('DOMContentLoaded', () => {
  hoverEffects.init();
});

