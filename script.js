// Three.js setup
let scene, camera, renderer;

function initThreeJS() {
    if (!scene) {
        scene = new THREE.Scene();
        // Explicitly set a transparent background
        scene.background = null;
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
            renderer.setClearColor(0x000000, 0); // Ensure transparency
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
        const radius = Math.random() * 50;

        positions[i * 3] = x + radius * Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = y + radius * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = z + radius * Math.cos(theta);

        velocities.push(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );

        const color = new THREE.Color();
        color.setHSL(Math.random(), 0.9, 0.7);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    supernovas.push({ mesh: particleSystem, life: 100 });
}

function animate() {
    requestAnimationFrame(animate);

    // Update points
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += (Math.sin(Date.now() * 0.0001 + i) * 0.1 - 0.05);
        if (positions[i + 2] < -1000) positions[i + 2] += 2000;
    }
    geometry.attributes.position.needsUpdate = true;

    // Update camera
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Update comets
    comets.forEach(comet => comet.update());

    // Update supernovas
    supernovas.forEach((supernova, index) => {
        const positions = supernova.mesh.geometry.attributes.position.array;
        const velocities = supernova.mesh.geometry.attributes.velocity.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i / 3];
            positions[i + 1] += velocities[i / 3 + 1];
            positions[i + 2] += velocities[i / 3 + 2];
        }
        supernova.mesh.geometry.attributes.position.needsUpdate = true;
        supernova.life -= 1;
        if (supernova.life <= 0) {
            scene.remove(supernova.mesh);
            supernovas.splice(index, 1);
        }
    });

    if (Math.random() > 0.995) {
        createSupernova(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
    }

    renderer.render(scene, camera);
}

animate();

// Preloader
const preloader = document.querySelector('.preloader');
if (preloader) {
    window.addEventListener('load', () => {
        preloader.style.display = 'none';
    });
}

// Cursor Effects
const cursor = document.getElementById('cursor');
const cursorBlur = document.getElementById('cursor-blur');

document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    cursorBlur.style.left = x + 'px';
    cursorBlur.style.top = y + 'px';

    const elements = document.elementsFromPoint(x, y);
    if (elements.some(el => el.tagName === 'A' || el.classList.contains('scroll-button'))) {
        cursor.style.borderColor = '#ff00f7';
        cursorBlur.style.background = 'rgba(255, 0, 247, 0.2)';
    } else {
        cursor.style.borderColor = '#00f7ff';
        cursorBlur.style.background = 'rgba(0, 247, 255, 0.1)';
    }
});

document.addEventListener('mousedown', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    cursorBlur.style.transform = 'translate(-50%, -50%) scale(0.8)';
});

document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorBlur.style.transform = 'translate(-50%, -50%) scale(1)';
});

// Music Toggle
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let isPlaying = false;

if (musicToggle) {
    musicToggle.addEventListener('click', () => {
        if (isPlaying) {
            bgMusic.pause();
            musicToggle.innerHTML = '<i class="fas fa-music"></i>';
            isPlaying = false;
        } else {
            bgMusic.play();
            musicToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
            isPlaying = true;
        }
    });
}

// Quote Machine
const quotes = [
    "Music washes away from the soul the dust of everyday life. - Berthold Auerbach",
    "Without music, life would be a mistake. - Friedrich Nietzsche",
    "Music is the universal language of mankind. - Henry Wadsworth Longfellow",
    "One good thing about music, when it hits you, you feel no pain. - Bob Marley",
    "Music expresses that which cannot be put into words. - Victor Hugo"
];

function getNewQuote() {
    const quoteContent = document.querySelector('.quote-content');
    if (quoteContent) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const [quote, author] = quotes[randomIndex].split(' - ');
        quoteContent.innerHTML = `${quote} <span class="quote-author">- ${author}</span>`;
    }
}

// GSAP Animation
gsap.registerPlugin(ScrollTrigger);

gsap.to('.hero', {
    yPercent: 50,
    ease: "none",
    scrollTrigger: {
        trigger: '.hero',
        start: "top top", // Start when top of hero hits top of viewport
        end: "bottom top", // End when bottom of hero hits top of viewport
        scrub: true,
        invalidateOnRefresh: true
    }
});

// Scroll Functions
function scroll(containerId, amount) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollBy({ left: amount, behavior: 'smooth' });
    }
}

function navigateToTip() {
    window.location.href = 'tip.html';
}

// Back to Top
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.style.display = 'block';
        } else {
            backToTop.style.display = 'none';
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Event Listeners
const quoteContainer = document.querySelector('.quote-container');
if (quoteContainer) {
    quoteContainer.addEventListener('click', getNewQuote);
}

// Resize Handler
window.addEventListener('resize', () => {
    if (renderer && camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
