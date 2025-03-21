// Enhanced Theme Management System with persistent storage and application across pages
document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('currentTheme') || 'normal';
    const savedThemeTitle = localStorage.getItem('currentThemeTitle') || 'Normal Mode';

    // Apply saved theme immediately
    htmlElement.setAttribute('data-theme', savedTheme);
    if (themeToggle) {
        themeToggle.setAttribute('title', savedThemeTitle);
        themeToggle.setAttribute('aria-label', `Switch to next theme (current: ${savedThemeTitle})`);
    }

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

    if (themeToggle) {
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

            // Update starfield colors based on theme (if applicable)
            updateStarfieldColors(newTheme);

            console.log(`Theme changed to: ${newTheme}`);
        });
    }

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
    const audio = new Audio('https://od.lk/s/MzhfMjg2MDQ2MDJf/veazy%20x%20dpbeats.mp3'); // Replace with your preferred audio
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
    }

    // Back to Top Button with Scroll Visibility
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Show/hide back-to-top button based on scroll position
        window.addEventListener('scroll', () => {
            backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
        });
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
                    card.style.transition = 'opacity 0.3s ease'; // Smooth transition
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
    }

    // Initialize Three.js Starfield
    initThreeJS();
});

// Three.js Setup for Starfield
let scene, camera, renderer, points;

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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for performance
        camera.position.z = 1000;

        // Starfield
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const starCount = 15000;

        for (let i = 0; i < starCount; i++) {
            vertices.push(
                Math.random() * 2000 - 1000, // x
                Math.random() * 2000 - 1000, // y
                Math.random() * 2000 - 1000  // z
            );
            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.7, 0.7); // Initial random colors
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true // Stars fade with distance
        });

        points = new THREE.Points(geometry, material);
        scene.add(points);

        // Track mouse position
        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
            mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
        });

        // Animation
        function animate() {
            requestAnimationFrame(animate);

            // Rotate starfield
            points.rotation.x += 0.0002;
            points.rotation.y += 0.0003;

            // Adjust rotation based on mouse movement
            points.rotation.x += (mouseY - points.rotation.x) * 0.05;
            points.rotation.y += (mouseX - points.rotation.y) * 0.05;

            // Pulse scale subtly
            const time = Date.now() * 0.001;
            points.scale.setScalar(Math.sin(time) * 0.05 + 1); // Reduced amplitude for smoother effect

            renderer.render(scene, camera);
        }

        animate();
    } catch (err) {
        console.error('Failed to initialize Three.js:', err);
    }
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
    console.error('Magic search bar elements not found:', { magicButton, magicInput, magicAnswer });
}

// Update starfield colors based on theme
function updateStarfieldColors(theme) {
    if (!points || !points.geometry.attributes.color) return;

    const colorArray = points.geometry.attributes.color.array;
    const themeColors = {
        'normal': { h: 0.5, s: 0.7, l: 0.7 },
        'satin': { h: 0.11, s: 1, l: 0.5 }, // Gold-like
        'frosted': { h: 0.49, s: 1, l: 0.5 }, // Teal-like
        'veazy': { h: 0.33, s: 1, l: 0.5 }, // Green
        'white': { h: 0, s: 0, l: 1 }, // White
        'black': { h: 0, s: 0, l: 0.2 }, // Dark gray
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
        // Original themes
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
        // Modernized themes
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

    const themeColor = themeColors[theme] || { h: Math.random(), s: 0.7, l: 0.7 }; // Fallback to random
    for (let i = 0; i < colorArray.length; i += 3) {
        const color = new THREE.Color().setHSL(
            (themeColor.h + Math.random() * 0.1) % 1, // Slight hue variation
            themeColor.s,
            themeColor.l
        );
        colorArray[i] = color.r;
        colorArray[i + 1] = color.g;
        colorArray[i + 2] = color.b;
    }
    points.geometry.attributes.color.needsUpdate = true;
}

// Resize Handler
window.addEventListener('resize', () => {
    if (renderer && camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
