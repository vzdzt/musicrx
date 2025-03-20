// Enhanced Theme Management System with persistent storage and application across pages
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme system with localStorage persistence
    const themeToggle = document.getElementById('themeToggle');
    const body = document.documentElement;

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('currentTheme') || 'normal';
    const savedThemeTitle = localStorage.getItem('currentThemeTitle') || 'Normal Mode';

    // Apply saved theme immediately
    body.setAttribute('data-theme', savedTheme);
    if (themeToggle) {
        themeToggle.setAttribute('title', savedThemeTitle);
    }

    const themes = [
        'normal', 'satin', 'frosted', 'veazy', 'white', 'black',
        'all-white', 'all-red', 'all-blue', 'pink-rose', 'blue-sky',
        'yellow-beige', 'green', 'purple-lavender', 'vogue', 'neon-future',
        'midnight-gold', 'desert-oasis', 'cyber-punk', 'aurora-breeze', 'flat-white', 'cd-case'
    ];
    const themeTitles = [
        'Normal Mode', 'Satin Mode', 'Frosted Mode', 'Veazy Mode', 'White Mode', 'Black Mode',
        'All White Mode', 'All Red Mode', 'All Blue Mode', 'Pink Rose Mode', 'Blue Sky Mode',
        'Yellow Beige Mode', 'Green Mode', 'Purple Lavender Mode', 'Vogue Mode', 'Neon Future Mode',
        'Midnight Gold Mode', 'Desert Oasis Mode', 'Cyber Punk Mode', 'Aurora Breeze Mode', 'Flat White Mode', 'CD Case Mode'
    ];

    // Get stored theme or default to 0
    let currentThemeIndex = themes.indexOf(savedTheme);

    // Enhanced theme toggle with localStorage persistence
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const newTheme = themes[currentThemeIndex];
            const newThemeTitle = themeTitles[currentThemeIndex];

            // Save to localStorage
            localStorage.setItem('currentTheme', newTheme);
            localStorage.setItem('currentThemeTitle', newThemeTitle);

            // Apply theme
            body.setAttribute('data-theme', newTheme);
            themeToggle.setAttribute('title', newThemeTitle);

            // Log theme change for debugging
            console.log(`Theme changed to: ${newTheme}`);
        });
    }

    // Enhanced dropdown menu functionality
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        const menu = toggle.nextElementSibling;
        if (!menu) return;

        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('active');
                }
            });

            menu.classList.toggle('active');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
});

// Three.js setup for starfield (global)
let scene, camera, renderer;

// Initialize starfield on all pages
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
});

function initThreeJS() {
    const canvas = document.getElementById('universe');
    if (canvas && !scene) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            alpha: true,
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        camera.position.z = 1000;

        // Starfield
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];

        for (let i = 0; i < 15000; i++) {
            vertices.push(
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000
            );
            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.8, 0.8);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const points = new THREE.Points(geometry, material);
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

            points.rotation.x += 0.0002;
            points.rotation.y += 0.0003;

            points.rotation.x += (mouseY - points.rotation.x) * 0.05;
            points.rotation.y += (mouseX - points.rotation.y) * 0.05;

            const time = Date.now() * 0.001;
            points.scale.x = points.scale.y = points.scale.z = Math.sin(time) * 0.15 + 1;

            const positions = points.geometry.attributes.position.array;
            const colors = points.geometry.attributes.color.array;
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = Math.sin(time + positions[i] * 0.001) * 0.5 + 0.5;
                colors[i + 1] = Math.cos(time + positions[i + 1] * 0.001) * 0.5 + 0.5;
                colors[i + 2] = Math.sin(time + positions[i + 2] * 0.002) * 0.5 + 0.5;
            }
            points.geometry.attributes.color.needsUpdate = true;

            renderer.render(scene, camera);
        }

        animate();
    }
}

initThreeJS();

// Resize handler
window.addEventListener('resize', () => {
    if (renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Subpage-specific event listeners (avoid homepage-specific elements)
document.addEventListener('DOMContentLoaded', () => {
    // Search functionality for subpages (e.g., reviews.html)
    const searchInput = document.getElementById('reviewSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.glass-card');

            cards.forEach(card => {
                const artistName = card.querySelector('h2')?.textContent.toLowerCase() || '';
                const shouldShow = artistName.includes(searchTerm);
                card.style.display = shouldShow ? 'flex' : 'none';
                card.style.opacity = shouldShow ? '1' : '0';
            });
        });
    }

    // Music toggle (global)
    const bgMusic = document.getElementById('bgMusic');
    const musicToggle = document.getElementById('musicToggle');

    if (bgMusic && musicToggle) {
        bgMusic.volume = 0.5;

        musicToggle.addEventListener('click', async () => {
            try {
                if (bgMusic.paused) {
                    await bgMusic.play();
                    musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    bgMusic.pause();
                    musicToggle.innerHTML = '<i class="fas fa-music"></i>';
                }
            } catch (err) {
                console.error('Audio playback error:', err);
            }
        });
    }

    // GSAP animations (only if applicable to subpages)
    gsap.registerPlugin(ScrollTrigger);
});

// Quotes system (if used in subpages)
const quotes = [
    { text: "One good thing about music, when it hits you, you feel no pain.", author: "Bob Marley" },
    // ... (other quotes remain unchanged)
];

function getNewQuote() {
    const quoteTexts = document.querySelectorAll('.quote-text');
    if (quoteTexts.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const quoteContent = `
            <div class="quote-content">${randomQuote.text.split('').map(char => 
                char === ' ' ? ' ' : `<span>${char}</span>`
            ).join('')}</div>
            <div class="quote-author">- ${randomQuote.author}</div>
        `;
        quoteTexts.forEach(quoteText => {
            quoteText.innerHTML = quoteContent;
        });
    }
}

function initializeQuotes() {
    getNewQuote();
}

// Smooth scroll (global)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const section = document.querySelector(this.getAttribute('href'));
        if (section) {
            section.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
