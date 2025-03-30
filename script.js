// Scroll function for horizontal sections
function scroll(containerId, distance) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    } else {
        console.warn(`Scroll container with ID '${containerId}' not found.`);
    }
}

// Enhanced Theme Management System with persistent storage and application across pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('script.js loaded');

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
        'normal', 'satin', 'frosted', 'veazy', 'white', 'black',
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
        'Normal Mode', 'Satin Mode', 'Frosted Mode', 'Veazy Mode', 'White Mode', 'Black Mode',
        'All White Mode', 'All Red Mode', 'All Blue Mode', 'Pink Rose Mode', 'Blue Sky Mode',
        'Yellow Beige Mode', 'Green Mode', 'Purple Lavender Mode', 'Vogue Mode', 'Neon Future Mode',
        'Midnight Gold Mode', 'Desert Oasis Mode', 'Cyber Punk Mode', 'Aurora Breeze Mode', 'Glass Morphism Mode',
        'Galactic Nebula Mode', 'Electric Storm Mode', 'Void Pulse Mode', 'Prism Shard Mode',
        'Inferno Core Mode', 'Cosmic Rift Mode', 'Neon Eclipse Mode', 'Quantum Flux Mode',
        'Holo Abyss Mode', 'Spectral Surge Mode', 'Starforge Nebula Mode', 'Thunder Vortex Mode',
        'Abyss Echo Mode', 'Crystal Prism Mode', 'Magma Forge Mode', 'Dimensional Veil Mode',
        'Shadow Pulse Mode', 'Flux Horizon Mode', 'Holo Vortex Mode', 'Waveform Surge Mode'
    ];

    if (themes.length !== themeTitles.length) {
        console.error('Themes and themeTitles arrays must have the same length');
        return;
    }

    let currentThemeIndex = themes.indexOf(savedTheme);

    themeToggle.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        const newThemeTitle = themeTitles[currentThemeIndex];

        // Save to localStorage
        localStorage.setItem('currentTheme', newTheme);
        localStorage.setItem('currentThemeTitle', newThemeTitle);

        // Apply theme
        htmlElement.setAttribute('data-theme', newTheme);
        themeToggle.setAttribute('title', newThemeTitle);
        themeToggle.setAttribute('aria-label', `Switch to next theme (current: ${newThemeTitle})`);

        // Update starfield colors
        updateStarfieldColors(newTheme);

        console.log(`Theme changed to: ${newTheme}`);
    });

    // Dropdown Menu Functionality
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');

    dropdownToggles.forEach(toggle => {
        const menu = toggle.nextElementSibling;
        if (!menu) {
            console.warn('Dropdown menu not found for toggle:', toggle);
            return;
        }

        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Close all other dropdowns
            dropdownMenus.forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('active');
                }
            });

            menu.classList.toggle('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdownMenus.forEach(menu => menu.classList.remove('active'));
        }
    });

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

    // Search Functionality with Debounce
    function debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    function setupSearch(searchInput) {
        if (searchInput) {
            const cards = document.querySelectorAll('.glass-card:not(.title-card):not(.content-card):not(:has(.table-container))');
            searchInput.addEventListener('input', debounce((e) => {
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
    }

    setupSearch(document.getElementById('reviewSearch'));
    setupSearch(document.getElementById('featureSearch'));

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
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

    // Initialize Three.js Starfield
    initThreeJS();
});

// Three.js Setup for Starfield
let scene, camera, renderer, starField;

function initThreeJS() {
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
            starField.rotation.x += 0.0002;
            starField.rotation.y += 0.0003;
            starField.rotation.x += (mouseY - starField.rotation.x) * 0.05;
            starField.rotation.y += (mouseX - starField.rotation.y) * 0.05;
            const time = Date.now() * 0.001;
            starField.scale.setScalar(Math.sin(time) * 0.05 + 1);
            renderer.render(scene, camera);
        }

        animate();
        console.log('Starfield initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Three.js:', err);
    }
}

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
        'vogue': { h: 0.33, s: 0.2, l: 0.7 },
        'neon-future': { h: 0.5, s: 1, l: 0.6 },
        'midnight-gold': { h: 0.14, s: 1, l: 0.5 },
        'desert-oasis': { h: 0.08, s: 1, l: 0.5 },
        'cyber-punk': { h: 0.83, s: 1, l: 0.5 },
        'aurora-breeze': { h: 0.5, s: 0.8, l: 0.7 },
        'glass-morphism': { h: 0.58, s: 0.7, l: 0.8 },
        'galactic-nebula': { h: 0.92, s: 1, l: 0.6 },
        'electric-storm': { h: 0.5, s: 1, l: 0.6 },
        'void-pulse': { h: 0.83, s: 1, l: 0.5 },
        'prism-shard': { h: 0.5, s: 0.8, l: 0.7 },
        'inferno-core': { h: 0.05, s: 1, l: 0.5 },
        'cosmic-rift': { h: 0.75, s: 1, l: 0.6 },
        'neon-eclipse': { h: 0.83, s: 1, l: 0.5 },
        'quantum-flux': { h: 0.5, s: 0.9, l: 0.6 },
        'holo-abyss': { h: 0.58, s: 1, l: 0.6 },
        'spectral-surge': { h: 0.0, s: 1, l: 0.6 },
        'starforge-nebula': { h: 0.92, s: 1, l: 0.6 },
        'thunder-vortex': { h: 0.5, s: 1, l: 0.6 },
        'abyss-echo': { h: 0.83, s: 1, l: 0.5 },
        'crystal-prism': { h: 0.5, s: 0.8, l: 0.7 },
        'magma-forge': { h: 0.05, s: 1, l: 0.5 },
        'dimensional-veil': { h: 0.75, s: 1, l: 0.6 },
        'shadow-pulse': { h: 0.83, s: 1, l: 0.5 },
        'flux-horizon': { h: 0.5, s: 0.9, l: 0.6 },
        'holo-vortex': { h: 0.58, s: 1, l: 0.6 },
        'waveform-surge': { h: 0.0, s: 1, l: 0.6 }
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

// Magic Search Bar Logic (Homepage Only)
const magicButton = document.getElementById('magicButton');
const magicInput = document.getElementById('magicInput');
const magicAnswer = document.getElementById('magicAnswer');
const answers = [
    "Yes, absolutely!",
    "No, not at all.",
    "Maybe, who knows?",
    "Yes, but with a twist.",
    "No, try again later.",
    "Just put the fries in the bag bro.",
    "She don't want you.",
    "You might be on to something.",
    "Only one way to find out.",
    "I'm not sure, but I'm sure it's a no.",
    "She still doesn't want you.",
    "LOL, no.",
    "She hates you",
    "You not fighting demons bro do the dishes.",
    "You're not gonna get anywhere with that.",
    "Dawg you're pushing 30.",
    "Bro you're 40.",
    "Nah.",
    "You should call her.",
    "Trust me, she's not gonna like you.",
    "She still loves you.",
    "Call them.",
    "I'm so fucked up right now 😹",
    "BRO STFU!",
    "You're going to make it gang.",
    "Just keep pushing bro.",
    "It'll get better.",
    "One step at a time twin.",
    "Pack it up bro its over.",
    "GIVE UP."
];

if (magicButton && magicInput && magicAnswer) {
    console.log('Magic search bar elements found:', { magicButton, magicInput, magicAnswer });
    console.log('Answers array:', answers);

    magicButton.addEventListener('click', () => {
        console.log('Magic button clicked');
        if (magicInput.value.trim()) {
            const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
            console.log('Selected answer:', randomAnswer);
            magicAnswer.textContent = randomAnswer;
        } else {
            magicAnswer.textContent = "Ask me something first!";
        }
    });

    magicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter key pressed');
            if (magicInput.value.trim()) {
                const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
                console.log('Selected answer:', randomAnswer);
                magicAnswer.textContent = randomAnswer;
            } else {
                magicAnswer.textContent = "Ask me something first!";
            }
        }
    });
} else {
    console.log('Magic search bar elements not found:', { magicButton, magicInput, magicAnswer });
}

// Resize Handler
window.addEventListener('resize', () => {
    if (renderer && camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
// 31. WebGPU Particle System
async function initWebGPU() {
    if (!navigator.gpu) return console.warn('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.getElementById('gpu-particles');
    if (!canvas) return;
    const context = canvas.getContext('webgpu');
    context.configure({ device, format: 'bgra8unorm', alphaMode: 'premultiplied' });
    console.log('WebGPU initialized');
    // Add particle rendering logic here
}
initWebGPU();

// 32. IntersectionObserver v2 for Hover Tracking
const hoverObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.isVisible) {
            entry.target.classList.add('glow-transition');
        } else {
            entry.target.classList.remove('glow-transition');
        }
    });
}, { threshold: 0.5, trackVisibility: true, delay: 100 });
document.querySelectorAll('.glass-card').forEach(card => hoverObserver.observe(card));

// 33. Web Audio API Visualizer
function audioVisualizer() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    source.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = 'var(--dark)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i];
            ctx.fillStyle = `hsl(${i * 2}, 70%, 50%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}
document.getElementById('musicToggle')?.addEventListener('click', audioVisualizer);

// 34. Scroll Timeline API
if ('ScrollTimeline' in window) {
    const scrollTimeline = new ScrollTimeline({
        source: document.documentElement,
        orientation: 'block',
    });
    document.querySelectorAll('.scroll-glow').forEach(el => {
        el.animate({ transform: ['scale(1)', 'scale(1.1)'] }, { timeline: scrollTimeline });
    });
}

// 35. ResizeObserver for Dynamic Layout
const resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
        const width = entry.contentRect.width;
        entry.target.style.setProperty('--container-width', `${width}px`);
    });
});
document.querySelectorAll('.responsive-card').forEach(card => resizeObserver.observe(card));

// 36. Pointer Lock for Immersive Navigation
document.getElementById('universe')?.addEventListener('click', () => {
    document.body.requestPointerLock();
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement) {
            starField.rotation.x += e.movementY * 0.001;
            starField.rotation.y += e.movementX * 0.001;
        }
    });
});

// 37. Vibration API Feedback
document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('click', () => {
        if ('vibrate' in navigator) navigator.vibrate(50);
    });
});

// 38. Clipboard API for Theme Sharing
document.getElementById('themeToggle')?.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('currentTheme');
    navigator.clipboard.writeText(`Current theme: ${currentTheme}`);
});

// 39. Web Share API
function shareTheme() {
    if (navigator.share) {
        navigator.share({
            title: 'My Theme',
            text: `Check out my current theme: ${localStorage.getItem('currentThemeTitle')}`,
            url: window.location.href,
        });
    }
}
document.getElementById('themeToggle')?.addEventListener('dblclick', shareTheme);

// 40. Motion Sensors
if ('DeviceMotionEvent' in window) {
    window.addEventListener('devicemotion', (e) => {
        const accel = e.accelerationIncludingGravity;
        starField.rotation.x += accel.y * 0.0001;
        starField.rotation.y += accel.x * 0.0001;
    });
}

// 41. Speech Synthesis for Theme Announcements
function announceTheme() {
    const msg = new SpeechSynthesisUtterance(`Theme changed to ${localStorage.getItem('currentThemeTitle')}`);
    msg.pitch = 1.2;
    msg.rate = 1.1;
    window.speechSynthesis.speak(msg);
}
document.getElementById('themeToggle')?.addEventListener('click', announceTheme);

// 42. Eye Tracking (WebGazer.js or similar required)
if (typeof webgazer !== 'undefined') {
    webgazer.setGazeListener((data) => {
        if (data) {
            const x = data.x / window.innerWidth - 0.5;
            const y = data.y / window.innerHeight - 0.5;
            starField.rotation.y = x * 0.5;
            starField.rotation.x = y * 0.5;
        }
    }).begin();
}
// 43. Custom Paint API for Neon Drip Effect with Theme Sync
if ('paintWorklet' in CSS) {
    const neonDripWorklet = `
        class NeonDripPainter {
            static get inputProperties() {
                return ['--drip-offset', '--primary', '--glow'];
            }
            paint(ctx, size, properties) {
                const dripOffset = parseFloat(properties.get('--drip-offset')) || 0;
                const primaryColor = properties.get('--primary').toString() || 'rgba(0, 255, 255, 0.5)';
                const glowColor = properties.get('--glow').toString() || 'rgba(0, 247, 255, 0.5)';
                const { width, height } = size;

                ctx.fillStyle = primaryColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = glowColor;

                ctx.beginPath();
                for (let x = 0; x < width; x += 5) {
                    const y = Math.sin(x * 0.05 + dripOffset * 0.1) * 30 + height / 2;
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
            }
        }
        registerPaint('neon-drip', NeonDripPainter);
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

// 44. Enhanced Starfield with Theme-Driven Colors
function syncStarfieldWithTheme() {
    if (!starField || !starField.geometry.attributes.color) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const primary = rootStyle.getPropertyValue('--primary').trim();
    const secondary = rootStyle.getPropertyValue('--secondary').trim();
    const colorArray = starField.geometry.attributes.color.array;

    for (let i = 0; i < colorArray.length; i += 3) {
        const color = new THREE.Color(i % 6 === 0 ? primary : secondary);
        colorArray[i] = color.r;
        colorArray[i + 1] = color.g;
        colorArray[i + 2] = color.b;
    }
    starField.geometry.attributes.color.needsUpdate = true;
}
document.getElementById('themeToggle')?.addEventListener('click', syncStarfieldWithTheme);

// 45. Audio Visualizer with Theme Colors
function enhancedAudioVisualizer() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    source.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512; // Higher resolution
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = document.createElement('canvas');
    canvas.className = 'audio-visualizer';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth * 0.8;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    function draw() {
        requestAnimationFrame(draw);
        const rootStyle = getComputedStyle(document.documentElement);
        const primary = rootStyle.getPropertyValue('--primary').trim();
        const glow = rootStyle.getPropertyValue('--glow').trim();

        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = 'var(--dark)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 1.5;
            ctx.fillStyle = `color-mix(in srgb, ${primary}, ${glow} ${i % 2 ? 70 : 30}%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}
document.getElementById('musicToggle')?.removeEventListener('click', audioVisualizer); // Replace old version
document.getElementById('musicToggle')?.addEventListener('click', enhancedAudioVisualizer);

// 46. Expanded Scroll Timeline Effects
if ('ScrollTimeline' in window) {
    const scrollTimeline = new ScrollTimeline({
        source: document.documentElement,
        orientation: 'block',
    });
    document.querySelectorAll('.glass-card').forEach(el => {
        el.animate(
            { transform: ['translateY(50px)', 'translateY(0)'], opacity: [0, 1] },
            { timeline: scrollTimeline, duration: 1, fill: 'both' }
        );
    });
    document.querySelectorAll('.navbar').forEach(el => {
        el.animate(
            { backgroundColor: ['var(--card-background)', 'color-mix(in srgb, var(--primary), transparent 80%)'] },
            { timeline: scrollTimeline, duration: 1 }
        );
    });
}

// 47. WebGPU Particle System Upgrade
async function enhancedWebGPU() {
    if (!navigator.gpu) return console.warn('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.getElementById('gpu-particles') || document.createElement('canvas');
    canvas.id = 'gpu-particles';
    document.body.appendChild(canvas);
    const context = canvas.getContext('webgpu');
    context.configure({ device, format: 'bgra8unorm', alphaMode: 'premultiplied' });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particleCount = 10000;
    const particles = new Float32Array(particleCount * 4); // x, y, vx, vy
    for (let i = 0; i < particleCount * 4; i += 4) {
        particles[i] = Math.random() * canvas.width;
        particles[i + 1] = Math.random() * canvas.height;
        particles[i + 2] = (Math.random() - 0.5) * 2;
        particles[i + 3] = (Math.random() - 0.5) * 2;
    }

    const particleBuffer = device.createBuffer({
        size: particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(particleBuffer, 0, particles);

    // Placeholder for shader and render pipeline (simplified)
    console.log('WebGPU particle system initialized. Add shaders for rendering.');
}
initWebGPU = enhancedWebGPU; // Override the original
initWebGPU();

// 48. Optimized Hover Glow with CSS Variables
document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.setProperty('--glow-intensity', '1');
    });
    card.addEventListener('mouseleave', () => {
        card.style.setProperty('--glow-intensity', '0');
    });
});

// 49. Polished Speech Synthesis with Theme Voices
function enhancedAnnounceTheme() {
    const theme = localStorage.getItem('currentTheme');
    const msg = new SpeechSynthesisUtterance(`Theme changed to ${localStorage.getItem('currentThemeTitle')}`);
    const voices = speechSynthesis.getVoices();
    const voiceMap = {
        'neon-future': voices.find(v => v.name.includes('Google US')) || voices[0],
        'cyber-punk': voices.find(v => v.name.includes('Microsoft')) || voices[1],
        'normal': voices.find(v => v.name.includes('Samantha')) || voices[2],
    };
    msg.voice = voiceMap[theme] || voices[Math.floor(Math.random() * voices.length)];
    msg.pitch = theme.includes('neon') ? 1.4 : 1.2;
    msg.rate = theme.includes('cyber') ? 1.3 : 1.1;
    window.speechSynthesis.speak(msg);
}
document.getElementById('themeToggle')?.removeEventListener('click', announceTheme);
document.getElementById('themeToggle')?.addEventListener('click', enhancedAnnounceTheme);

// 50. Performance Tweaks
window.addEventListener('resize', debounce(() => {
    if (renderer && camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}, 100));

// Optimize Three.js render loop
function optimizedAnimate() {
    requestAnimationFrame(optimizedAnimate);
    const time = Date.now() * 0.001;
    starField.rotation.x += 0.0002;
    starField.rotation.y += 0.0003;
    starField.scale.setScalar(Math.sin(time) * 0.05 + 1);
    renderer.render(scene, camera);
}
if (starField) {
    optimizedAnimate(); // Replace the original animate call
}
// 51. Optimize Subpage Loading
if (window.location.pathname.includes('reviews.html')) {
    // Disable Scroll Timeline for reviews page
    if ('ScrollTimeline' in window) {
        document.querySelectorAll('.glass-card').forEach(el => {
            el.getAnimations().forEach(anim => anim.cancel()); // Cancel Scroll Timeline animations
        });
        console.log('Scroll Timeline disabled for reviews.html');
    }
    // Skip WebGPU on reviews page
    initWebGPU = () => console.log('WebGPU skipped on reviews.html');
    // Simplify audio visualizer
    document.getElementById('musicToggle')?.removeEventListener('click', enhancedAudioVisualizer);
    document.getElementById('musicToggle')?.addEventListener('click', () => {
        console.log('Simplified audio toggle on reviews.html');
    });
}
