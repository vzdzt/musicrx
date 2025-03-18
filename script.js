// Three.js setup - only initialize if not already initialized
let scene, camera, renderer;

function initThreeJS() {
    if (!scene) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const canvas = document.getElementById('universe');
        if (canvas) {
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                alpha: true,
                antialias: true 
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            camera.position.z = 1000;
        }
    }
}

initThreeJS();

// Initialize geometry
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

// Comet effect
class Comet {
    constructor() {
        this.position = new THREE.Vector3(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        this.trail = [];
        this.trailLength = 20;

        const geometry = new THREE.SphereGeometry(2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x00f7ff),
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }

    update() {
        this.position.add(this.velocity);
        this.mesh.position.copy(this.position);

        this.trail.push(this.position.clone());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        if (Math.abs(this.position.x) > 1000 || 
            Math.abs(this.position.y) > 1000 || 
            Math.abs(this.position.z) > 1000) {
            this.position.set(
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000,
                Math.random() * 2000 - 1000
            );
            this.trail = [];
        }
    }
}

const comets = Array(5).fill(null).map(() => new Comet());
const supernovas = [];

function createSupernova(x, y, z) {
    const particles = new THREE.BufferGeometry();
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        const velocity = Math.random() * 30 + 20;

        positions[i * 3] = x + Math.sin(theta) * Math.cos(phi) * radius;
        positions[i * 3 + 1] = y + Math.sin(theta) * Math.sin(phi) * radius;
        positions[i * 3 + 2] = z + Math.cos(theta) * radius;

        velocities.push({
            x: velocity * Math.sin(theta) * Math.cos(phi),
            y: velocity * Math.sin(theta) * Math.sin(phi),
            z: velocity * Math.cos(theta)
        });

        colors[i * 3] = 1;
        colors[i * 3 + 1] = Math.random() * 0.5 + 0.5;
        colors[i * 3 + 2] = Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 8,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(particles, material);
    scene.add(points);

    return { points, velocities };
}

function updateSupernovas() {
    for (let i = supernovas.length - 1; i >= 0; i--) {
        const supernova = supernovas[i];
        const positions = supernova.points.geometry.attributes.position.array;
        const colors = supernova.points.geometry.attributes.color.array;

        for (let j = 0; j < positions.length; j += 3) {
            positions[j] += supernova.velocities[j/3].x;
            positions[j + 1] += supernova.velocities[j/3].y;
            positions[j + 2] += supernova.velocities[j/3].z;

            const alpha = 1 - (supernova.age / supernova.maxAge);
            colors[j] *= alpha;
            colors[j + 1] *= alpha;
            colors[j + 2] *= alpha;
        }

        supernova.points.geometry.attributes.position.needsUpdate = true;
        supernova.points.geometry.attributes.color.needsUpdate = true;
        supernova.points.material.opacity = 1 - (supernova.age / supernova.maxAge);

        supernova.age++;

        if (supernova.age >= supernova.maxAge) {
            scene.remove(supernova.points);
            supernovas.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    comets.forEach(comet => comet.update());

    points.rotation.x += 0.0002;
    points.rotation.y += 0.0003;

    points.rotation.x += (mouseY - points.rotation.x) * 0.05;
    points.rotation.y += (mouseX - points.rotation.y) * 0.05;

    const time = Date.now() * 0.001;
    points.scale.x = points.scale.y = points.scale.z = Math.sin(time) * 0.15 + 1;

    const positions = points.geometry.attributes.position.array;
    const colors = points.geometry.attributes.color.array;
    for(let i = 0; i < colors.length; i += 3) {
        colors[i] = Math.sin(time + positions[i] * 0.001) * 0.5 + 0.5;
        colors[i + 1] = Math.cos(time + positions[i + 1] * 0.001) * 0.5 + 0.5;
        colors[i + 2] = Math.sin(time + positions[i + 2] * 0.002) * 0.5 + 0.5;
    }
    points.geometry.attributes.color.needsUpdate = true;

    updateSupernovas();
    renderer.render(scene, camera);
}

// Initialize
animate();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Search functionality
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
    const universeCanvas = document.getElementById('universe');
    if (universeCanvas) {
        universeCanvas.addEventListener('click', (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            const vector = new THREE.Vector3(x * 1000, y * 1000, 0);
            const supernova = createSupernova(vector.x, vector.y, vector.z);
            supernovas.push({ 
                ...supernova, 
                age: 0,
                maxAge: 100 
            });
        });
    }

    // Handle music toggle
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

    const cursor = document.getElementById('cursor');
    const cursorBlur = document.getElementById('cursor-blur');

    if (cursor && cursorBlur) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
            cursorBlur.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        });
    }

    // Landing page handler
    const landingPage = document.getElementById('landing-page');
    if (landingPage) {
        landingPage.addEventListener('click', () => {
            landingPage.classList.add('fade-out');
            setTimeout(() => {
                initializeQuotes();
            }, 100);
        });
    }

    // Initialize preloader
    const preloader = document.getElementById('preloader');
    let width = 0;
    const interval = setInterval(() => {
        width += 2;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = width + '%';
        }
        if (width >= 100) {
            clearInterval(interval);
            if (preloader) {
                preloader.style.opacity = '0';
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 500);
            }
        }
    }, 20);


    // Initialize content display
    document.querySelectorAll('.content-details').forEach(content => {
        // Set initial style to avoid flicker
        content.style.opacity = '0';
        content.style.display = 'none';
    });

    // Make sure trending content is properly styled
    const trendingContent = document.getElementById('content-trending');
    if (trendingContent) {
        trendingContent.style.display = 'flex';
        trendingContent.style.flexDirection = 'column';
        trendingContent.style.width = '100%';
        trendingContent.style.opacity = '1'; // Set to visible since we're placing it below News
    }

    // Add hover sound effects with error handling
    function playRandomSound() {
        try {
            const sounds = [
                document.getElementById('hover-sound-1'),
                document.getElementById('hover-sound-2'),
                document.getElementById('hover-sound-3')
            ];

            // Filter out null elements
            const validSounds = sounds.filter(sound => sound !== null);

            if (validSounds.length > 0) {
                const sound = validSounds[Math.floor(Math.random() * validSounds.length)];
                if (sound && typeof sound.play === 'function') {
                    sound.currentTime = 0;
                    sound.volume = 0.2;
                    sound.play().catch(e => console.log("Audio play prevented:", e));
                }
            }
        } catch (err) {
            console.log("Audio system error:", err);
            // Silently fail if audio can't be played
        }
    }

    document.querySelectorAll('.nav-links a, .social-button, .glass-card, .button').forEach(element => {
        element.addEventListener('mouseenter', () => {
            playRandomSound();
        });
    });
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// Quotes system
const quotes = [
            { text: "One good thing about music, when it hits you, you feel no pain.", author: "Bob Marley" },
            { text: "Music is the universal language of mankind.", author: "Henry Wadsworth Longfellow" },
            { text: "Where words fail, music speaks.", author: "Hans Christian Andersen" },
            { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
            { text: "Music is the strongest form of magic.", author: "Marilyn Manson" },
            { text: "Music produces a kind of pleasure which human nature cannot do without.", author: "Confucius" },
            { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
            { text: "Persistence is very important. You should not give up unless you are forced to give up.", author: "Elon Musk" },
            { text: "I rather be optimistic and wrong than pessimistic and right.", author: "Elon Musk" },
            { text: "Sometimes life hits you in the head with a brick. Don't lose faith.", author: "Steve Jobs" },
            { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
            { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
            { text: "Wherever you go, go with all your heart.", author: "Confucius" },
            { text: "Real knowledge is to know the extent of one's ignorance.", author: "Confucius" },
            { text: "The bamboo that bends is stronger than the oak that resists.", author: "Japanese Proverb" },
            { text: "Failure is an option here. If things are not failing, you are not innovating enough.", author: "Elon Musk" },
            { text: "I think it is possible for ordinary people to choose to be extraordinary.", author: "Elon Musk" },
            { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
            { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" }
];

function getNewQuote() {
    const quoteTexts = document.querySelectorAll('.quote-text');
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

function initializeQuotes() {
    const quoteTexts = document.querySelectorAll('.quote-text');
    if (quoteTexts.length > 0) {
        getNewQuote();
    }
}

// Show content function
function showContent(contentType) {
    const allContents = document.querySelectorAll('.content-details');
    allContents.forEach(content => {
        content.style.opacity = '0';
        setTimeout(() => {
            content.style.display = 'none';
        }, 300);
    });

    const selectedContent = document.getElementById(`content-${contentType}`);
    if (selectedContent) {
        // Special handling for trending content
        if (contentType === 'trending') {
            selectedContent.style.display = 'flex';
            selectedContent.style.flexDirection = 'column';
            selectedContent.style.width = '100%';
            selectedContent.style.maxWidth = '100%';
            selectedContent.style.margin = '2rem 0';
        } else {
            selectedContent.style.display = 'block';
        }

        selectedContent.offsetHeight; // Force reflow
        selectedContent.style.opacity = '1';
        selectedContent.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Disable 3D tilt effect for all cards
document.querySelectorAll('.glass-card').forEach(card => {
    // Apply inline styles to ensure flat cards
    card.style.transform = 'none !important';
    card.style.perspective = 'none !important';
    card.style.transformStyle = 'flat !important';
    card.style.transition = 'box-shadow 0.3s ease, opacity 0.3s ease !important';
    card.style.rotate = '0deg !important';

    // Remove any listeners that might be causing transforms
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);

    // Add only hover effect for box shadow
    newCard.addEventListener('mouseenter', () => {
        newCard.style.boxShadow = '0 0 20px rgba(0, 247, 255, 0.3)';
    });

    newCard.addEventListener('mouseleave', () => {
        newCard.style.boxShadow = '0 8px 32px rgba(0, 247, 255, 0.1)';
    });
});

// Reinitialize quotes when landing page is clicked
document.getElementById('landing-page').addEventListener('click', () => {
    setTimeout(initializeQuotes, 100);
});

// Smooth scroll
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

// GSAP animations - only keep hero animation, disable all card animations
gsap.registerPlugin(ScrollTrigger);

gsap.to('.hero', {
    yPercent: 50,
    ease: "none",
    scrollTrigger: {
        trigger: '.hero',
        start: "top top",
        end: "bottom top",
        scrub: true
    }
});

// Completely remove parallax effects for cards
document.querySelectorAll('.glass-card').forEach(card => {
    gsap.killTweensOf(card); // Kill any GSAP animations on cards

    // Reset to flat style
    card.style.transform = 'none !important';
    card.style.transformStyle = 'flat !important';
    card.style.perspective = 'none !important';
    card.style.transition = 'box-shadow 0.3s ease, opacity 0.3s ease !important';
});

// Completely remove mouse movement effects on cards
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        card.style.transform = 'none';
    });
});

// Replace with flat animation with no rotation
gsap.from('.glass-card', {
    duration: 1.2,
    y: 100,
    opacity: 0,
    rotation: 0, // Removed rotation
    stagger: 0.2,
    ease: 'power2.out', // Changed from elastic to prevent any bouncing
    scrollTrigger: {
        trigger: '.grid',
        start: 'top center+=100',
        toggleActions: 'play none none reverse'
    }
});


// Function to enforce flat cards throughout the page
function enforceFlatCards() {
    document.querySelectorAll('.glass-card').forEach(card => {
        // Apply inline styles to override any external animations
        card.style.cssText += `
            transform: none !important;
            perspective: none !important;
            transform-style: flat !important;
            rotate: 0deg !important;
            transition: box-shadow 0.3s ease, opacity 0.3s ease !important;
            transform-origin: center center !important;
        `;

        // Apply to all children as well
        card.querySelectorAll('*').forEach(child => {
            child.style.cssText += `
                transform: none !important;
                perspective: none !important;
                transform-style: flat !important;
            `;
        });
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', enforceFlatCards);

// Run on scroll to continuously enforce flat cards
window.addEventListener('scroll', enforceFlatCards);

// Apply a single event handler to manage all glass cards
function setupAllGlassCards() {
    document.querySelectorAll('.glass-card').forEach(card => {
        // Ensure cards have the overflow:hidden style to contain mirror effect
        card.style.overflow = 'hidden';

        // Remove any previous style overrides that might block effects
        card.style.removeProperty('transform-style');
        card.style.removeProperty('perspective');

        // Preserve position and transition for effects
        card.style.position = 'relative';
        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        // Add hover effect listeners
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 0 20px rgba(0, 247, 255, 0.3)';
            card.style.filter = 'brightness(1.1)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 8px 32px rgba(0, 247, 255, 0.1)';
            card.style.filter = 'brightness(1)';
        });
    });
}

// Run the setup initially
document.addEventListener('DOMContentLoaded', setupAllGlassCards);
window.addEventListener('resize', setupAllGlassCards);

// Don't prevent all mousemove effects, but ensure cards have proper overflow hidden
document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.glass-card').forEach(card => {
        if (card.style.overflow !== 'hidden') {
            card.style.overflow = 'hidden';
        }
    });
});

document.addEventListener('DOMContentLoaded', initializeQuotes);
