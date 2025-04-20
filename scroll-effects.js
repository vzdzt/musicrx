
// Scroll Effects
const scrollEffects = {
  init() {
    this.setupScrollGlow();
    this.setupParallaxScroll();
    this.setupScrollReveal();
  },

  setupScrollGlow() {
    gsap.utils.toArray('.scroll-glow').forEach(element => {
      ScrollTrigger.create({
        trigger: element,
        start: 'top center',
        onEnter: () => {
          gsap.to(element, {
            boxShadow: '0 0 30px var(--primary)',
            duration: 0.5
          });
        },
        onLeaveBack: () => {
          gsap.to(element, {
            boxShadow: '0 0 10px var(--glow)',
            duration: 0.5
          });
        }
      });
    });
  },

  setupParallaxScroll() {
    gsap.utils.toArray('.parallax').forEach(element => {
      gsap.to(element, {
        y: -50,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  },

  setupScrollReveal() {
    gsap.utils.toArray('.reveal-on-scroll').forEach(element => {
      gsap.from(element, {
        opacity: 0,
        y: 50,
        duration: 1,
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      });
    });
  }
};

// Initialize scroll effects
document.addEventListener('DOMContentLoaded', () => {
  scrollEffects.init();
});
document.querySelectorAll('.glass-card').forEach(card => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          card.style.setProperty('--scroll-offset', 
            `${Math.min(100, entry.intersectionRatio * 100)}%`);
          card.style.animation = 'quantum-shift 2s ease-out forwards';
        }
      });
    },
    { threshold: Array.from({length: 100}, (_, i) => i / 100) }
  );
  observer.observe(card);
});

// Register view transitions
document.documentElement.style.setProperty('view-transition-name', 'root');

