// Scroll function for horizontal sections
function scroll(containerId, distance) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    } else {
        console.warn(`Scroll container with ID '${containerId}' not found.`);
    }
}

// Debounce utility function
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
}

// Three.js Setup for Starfield
let camera, renderer, starField, scene = null;
let isInitialized = false;

function initThreeJS() {
    if (window.starfieldInitialized || isInitialized) return;
    window.starfieldInitialized = true;
    isInitialized = true;
    if (scene) return; // Prevent re-initialization
    const canvas = document.getElementById('universe');
    if (!canvas || typeof THREE === 'undefined') {
        console.error('Three.js is not loaded or canvas not found.');
        return;
    }

    try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 1000;

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const starCount = 15000;

        for (let i = 0; i < starCount; i++) {
            vertices.push(
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000
            );
            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.7, 0.7);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        starField = new THREE.Points(geometry, material);
        scene.add(starField);

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
            mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
        });

        function animate() {
            requestAnimationFrame(animate);
            if (starField) {
                starField.rotation.x += 0.0002;
                starField.rotation.y += 0.0003;
                starField.rotation.x += (mouseY - starField.rotation.x) * 0.05;
                starField.rotation.y += (mouseX - starField.rotation.y) * 0.05;
                const time = Date.now() * 0.001;
                starField.scale.setScalar(Math.sin(time) * 0.05 + 1);
            }
            renderer.render(scene, camera);
        }

        animate();
        console.log('Starfield initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Three.js:', err);
    }
}

// Main event listener 
document.addEventListener('DOMContentLoaded', () => {
    console.log('script.js loaded');

    // Initialize rating bars
    const ratingCategories = document.querySelectorAll('.rating-category');
    ratingCategories.forEach(category => {
        const score = category.getAttribute('data-score');
        const fill = category.querySelector('.progress-fill');
        if (fill) {
            fill.style.width = score + '%';
        }
    });

    // Theme Management
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    if (!themeToggle) {
        console.error('Theme toggle button not found.');
        return;
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('currentTheme') || 'normal';
    const savedThemeTitle = localStorage.getItem('currentThemeTitle') || 'Normal Mode';

    // Apply saved theme immediately
    htmlElement.setAttribute('data-theme', savedTheme);
    themeToggle.setAttribute('title', savedThemeTitle);
    themeToggle.setAttribute('aria-label', `Switch to next theme (current: ${savedThemeTitle})`);
    console.log(`Initial theme applied: ${savedTheme}`);

    const themes = [
        'mirror-glass', 'ultra-glass', 'normal', 'satin', 'frosted', 'veazy', 'white', 'black',
        'all-white', 'all-red', 'all-blue', 'pink-rose', 'blue-sky',
        'yellow-beige', 'green', 'purple-lavender', 'vogue', 'neon-future',
        'midnight-gold', 'desert-oasis', 'cyber-punk', 'aurora-breeze', 'glass-morphism',
        'galactic-nebula', 'electric-storm', 'void-pulse', 'prism-shard',
        'inferno-core', 'cosmic-rift', 'neon-eclipse', 'quantum-flux',
        'holo-abyss', 'spectral-surge', 'starforge-nebula', 'thunder-vortex',
        'abyss-echo', 'crystal-prism', 'magma-forge', 'dimensional-veil',
        'shadow-pulse', 'flux-horizon', 'holo-vortex', 'waveform-surge'
    ];

    const themeTitles = [
        'Mirror Glass Mode', 'Ultra Glass Mode', 'Normal Mode', 'Satin Mode', 'Frosted Mode', 'Veazy Mode', 'White Mode', 'Black Mode',
        'All White Mode', 'All Red Mode', 'All Blue Mode', 'Pink Rose Mode', 'Blue Sky Mode',
        'Yellow Beige Mode', 'Green Mode', 'Purple Lavender Mode', 'Vogue Mode', 'Neon Future Mode',
        'Midnight Gold Mode', 'Desert Oasis Mode', 'Cyber Punk Mode', 'Aurora Breeze Mode', 'Glass Morphism Mode',
        'Galactic Nebula Mode', 'Electric Storm Mode', 'Void Pulse Mode', 'Prism Shard Mode',
        'Inferno Core Mode', 'Cosmic Rift Mode', 'Neon Eclipse Mode', 'Quantum Flux Mode',
        'Holo Abyss Mode', 'Spectral Surge Mode', 'Starforge Nebula Mode', 'Thunder Vortex Mode',
        'Abyss Echo Mode', 'Crystal Prism Mode', 'Magma Forge Mode', 'Dimensional Veil Mode',
        'Shadow Pulse Mode', 'Flux Horizon Mode', 'Holo Vortex Mode', 'Waveform Surge Mode'
    ];

    let currentThemeIndex = themes.indexOf(savedTheme);

    themeToggle.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        const newThemeTitle = themeTitles[currentThemeIndex];

        localStorage.setItem('currentTheme', newTheme);
        localStorage.setItem('currentThemeTitle', newThemeTitle);

        htmlElement.setAttribute('data-theme', newTheme);
        themeToggle.setAttribute('title', newThemeTitle);
        themeToggle.setAttribute('aria-label', `Switch to next theme (current: ${newThemeTitle})`);

        updateStarfieldColors(newTheme);
        console.log(`Theme changed to: ${newTheme}`);
    });

    // Initialize Three.js starfield
    initThreeJS();

    // Search functionality
    const reviewSearch = document.getElementById('reviewSearch');
    if (reviewSearch) {
        const cards = document.querySelectorAll('.glass-card:not(.title-card):not(.content-card):not(:has(.table-container))');
        reviewSearch.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            cards.forEach(card => {
                const artistName = card.querySelector('h2')?.textContent.toLowerCase() || '';
                const shouldShow = artistName.includes(searchTerm);
                card.style.display = shouldShow ? 'flex' : 'none';
                card.style.opacity = shouldShow ? '1' : '0';
                card.style.transition = 'opacity 0.3s ease';
            });
        }, 300));
    }

    // Consolidated Dropdown Functionality
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    console.log('Dropdown toggles found:', dropdownToggles.length); // Debug log
    dropdownToggles.forEach(toggle => {
        const menu = toggle.nextElementSibling;
        if (!menu) {
            console.warn('Dropdown menu not found for toggle:', toggle);
            return;
        }

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu.active').forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });

            // Toggle current dropdown
            menu.classList.toggle('active');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    // Initialize magic search if elements exist
    const magicButton = document.getElementById('magicButton');
    const magicInput = document.getElementById('magicInput');
    const magicAnswer = document.getElementById('magicAnswer');

    if (magicButton && magicInput && magicAnswer) {
        const answers = [
            "Yes, absolutely!", "No, not at all.", "Maybe, who knows?",
            "Just put the fries in the bag bro.", "She don't want you.",
            "You might be on to something.", "Only one way to find out.",
            "She still doesn't want you.", "LOL, no.",
            "You not fighting demons bro do the dishes.",
            "Dawg you're pushing 30.", "Nah.", "You should call her.",
            "Trust me, she's not gonna like you.", "She still loves you.",
            "BRO STFU!", "You're going to make it gang.",
            "Just keep pushing bro.", "It'll get better.",
            "One step at a time twin.", "Pack it up bro its over.",
            "GIVE UP."
        ];

        magicButton.addEventListener('click', () => {
            if (magicInput.value.trim()) {
                const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
                magicAnswer.textContent = randomAnswer;
            } else {
                magicAnswer.textContent = "Ask me something first!";
            }
        });

        magicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (magicInput.value.trim()) {
                    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
                    magicAnswer.textContent = randomAnswer;
                } else {
                    magicAnswer.textContent = "Ask me something first!";
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
    // Cursor functionality
    const cursor = document.getElementById('cursor');
    const cursorBlur = document.getElementById('cursor-blur');

    // Cursor movement tracking
    document.addEventListener('mousemove', (e) => {
        if (cursor && cursorBlur) {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
            cursorBlur.style.left = `${e.clientX - 200}px`;
            cursorBlur.style.top = `${e.clientY - 200}px`;
        }
    });
});

    // Spotlight effect on card hover
    document.querySelectorAll('.glass-card, .news-title-card, .news-content-card, .track-highlight-item').forEach(card => {
        card.addEventListener('mouseenter', () => {
            if (cursor) cursor.style.transform = 'scale(2)';
            if (cursorBlur) cursorBlur.style.transform = 'scale(2)';
        });

        card.addEventListener('mouseleave', () => {
            if (cursor) cursor.style.transform = 'scale(1)';
            if (cursorBlur) cursorBlur.style.transform = 'scale(1)';
        });
    });
});

// Update starfield colors based on theme
function updateStarfieldColors(theme) {
    const target = starField || (window.points ? window.points : null) || (window.starsGeometry ? window.starsGeometry : null);
    if (!target || !target.geometry.attributes.color) {
        console.warn('Starfield not initialized or geometry not found.');
        return;
    }

    const colorArray = target.geometry.attributes.color.array;
    const themeColors = {
        'normal': { h: 0.5, s: 0.7, l: 0.7 },
        'satin': { h: 0.11, s: 1, l: 0.5 },
        'frosted': { h: 0.49, s: 1, l: 0.5 },
        'veazy': { h: 0.33, s: 1, l: 0.5 },
        'white': { h: 0, s: 0, l: 1 },
        'black': { h: 0, s: 0, l: 0.2 },
        'all-white': { h: 0, s: 0, l: 1 },
        'all-red': { h: 0, s: 1, l: 0.5 },
        'all-blue': { h: 0.67, s: 1, l: 0.5 },
        'pink-rose': { h: 0.92, s: 0.5, l: 0.7 },
        'blue-sky': { h: 0.58, s: 0.6, l: 0.7 },
        'yellow-beige': { h: 0.14, s: 0.8, l: 0.7 },
        'green': { h: 0.33, s: 0.6, l: 0.5 },
        'purple-lavender': { h: 0.75, s: 0.8, l: 0.6 },
        'neon-future': { h: 0.5, s: 1, l: 0.6 },
        'cyber-punk': { h: 0.83, s: 1, l: 0.5 }
    };

    const themeColor = themeColors[theme] || { h: Math.random(), s: 0.7, l: 0.7 };
    for (let i = 0; i < colorArray.length; i += 3) {
        const color = new THREE.Color().setHSL(
            (themeColor.h + Math.random() * 0.1) % 1,
            themeColor.s,
            themeColor.l
        );
        colorArray[i] = color.r;
        colorArray[i + 1] = color.g;
        colorArray[i + 2] = color.b;
    }
    target.geometry.attributes.color.needsUpdate = true;
}

// Initialize Custom Paint API for Neon Drip Effect
if ('paintWorklet' in CSS) {
    const neonDripWorklet = `
        registerPaint('neon-drip', class {
            static get inputProperties() {
                return [
                    '--drip-offset',
                    '--drip-speed',
                    '--drip-color',
                    '--primary',
                    '--glow',
                    '--background-color'
                ];
            }
            paint(ctx, size, properties) {
                const dripOffset = parseFloat(properties.get('--drip-offset')) || 0;
                const dripSpeed = parseFloat(properties.get('--drip-speed')) || 1;
                const dripColor = properties.get('--drip-color').toString() || properties.get('--primary').toString();
                const { width, height } = size;

                ctx.fillStyle = dripColor;
                ctx.globalAlpha = 0.6;

                for (let x = 0; x < width; x += 20) {
                    const wave = Math.sin(x * 0.05 + dripOffset) * 10;
                    const y = height / 2 + wave;

                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Add drip trail
                    for (let i = 1; i <= 3; i++) {
                        ctx.globalAlpha = 0.2 / i;
                        ctx.beginPath();
                        ctx.arc(x, y - i * 10, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
    `;
    const blob = new Blob([neonDripWorklet], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    CSS.paintWorklet.addModule(url).then(() => {
        console.log('Neon Drip Paint Worklet loaded with theme support.');
    }).catch(err => {
        console.error('Failed to load Neon Drip Worklet:', err);
    });
} else {
    console.warn('Custom Paint API not supported.');
}

// Smooth Scroll for Anchor Links (excluding dropdown toggles)
document.querySelectorAll('a[href^="#"]:not(.dropdown-toggle)').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const section = document.querySelector(this.getAttribute('href'));
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// GSAP Animations
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.scroll-item').forEach(item => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            ease: 'power2.out'
        });
    });
} else {
    console.warn('GSAP or ScrollTrigger not loaded.');
}

// Music Toggle Functionality
const musicToggle = document.getElementById('musicToggle');
const audio = document.getElementById('bgMusic') || new Audio('https://od.lk/s/MzhfMjg2MDQ2MDJf/veazy%20x%20dpbeats.mp3');
audio.loop = true;
let isPlaying = false;

if (musicToggle) {
    audio.volume = 0.5;
    musicToggle.setAttribute('aria-label', 'Play music');
    musicToggle.innerHTML = '<i class="fas fa-play"></i>';

    musicToggle.addEventListener('click', async () => {
        try {
            if (isPlaying) {
                audio.pause();
                musicToggle.innerHTML = '<i class="fas fa-play"></i>';
                musicToggle.setAttribute('aria-label', 'Play music');
            } else {
                await audio.play();
                musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
                musicToggle.setAttribute('aria-label', 'Pause music');
            }
            isPlaying = !isPlaying;
        } catch (err) {
            console.error('Audio playback error:', err);
        }
    });
} else {
    console.warn('Music toggle button not found.');
}

// Back to Top Button with Scroll Visibility
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
} else {
    console.warn('Back to top button not found.');
}

function scroll(sectionId, distance) {
    const container = document.getElementById(`${sectionId}-scroll`);
    if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('cursor');
    const cursorBlur = document.getElementById('cursor-blur');

    document.addEventListener('mousemove', (e) => {
        if (cursor && cursorBlur) {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
            cursorBlur.style.left = `${e.clientX - 50}px`; // Adjusted offset
            cursorBlur.style.top = `${e.clientY - 50}px`;
            // Optional pulse effect
            cursor.style.animation = 'pulse 1.5s infinite';
        }
    });
});

