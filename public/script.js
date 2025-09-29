// Footer visibility control
window.addEventListener('scroll', () => {
  const footer = document.querySelector('footer');
  if (footer) {
    const scrollPosition = Math.ceil(window.scrollY + window.innerHeight);
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight) {
      footer.classList.add('visible');
    } else {
      footer.classList.remove('visible');
    }
  }
});

// Global variables for starfield
window.isStarfieldActive = localStorage.getItem('starfieldEnabled') === 'true';
window.scene = null;
window.camera = null;
window.renderer = null;
window.starField = null;
window.mouseX = 0;
window.mouseY = 0;
window.targetX = 0;
window.targetY = 0;
let animationFrameId;

// Detect mobile device
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const starCount = isMobile ? 3000 : 10000; // Fewer particles on mobile
const useSimpleShader = isMobile; // Simplify shader on mobile

// Scroll function for horizontal sections
function scrollSection(containerId, distance) {
    const container = document.getElementById(`${containerId}-scroll`);
    if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    }
}

// Load new releases for the index page
async function loadNewReleases() {
    try {
        const response = await fetch('/api/new-releases?timeRange=month');
        if (!response.ok) {
            throw new Error(`Failed to load new releases: ${response.status}`);
        }

        const newReleases = await response.json();
        const scrollContainer = document.getElementById('new-releases-scroll');

        if (newReleases.length > 0) {
            let html = '';

            // Process albums to get their ratings
            const processedAlbums = await Promise.all(newReleases.map(async (album) => {
                let albumData = { ...album };

                // If album is rated, fetch the full data to get the score
                if (album.isRated) {
                    try {
                        const albumResponse = await fetch(`/api/album/${album.id}`);
                        if (albumResponse.ok) {
                            const fullAlbumData = await albumResponse.json();
                            albumData.score = fullAlbumData.score;
                            albumData.strengths = fullAlbumData.strengths;
                            albumData.weaknesses = fullAlbumData.weaknesses;
                        }
                    } catch (err) {
                        console.warn(`Could not fetch rating for album ${album.id}:`, err);
                    }
                }

                return albumData;
            }));

            processedAlbums.forEach((album) => {
                const title = album.title.length > 20 ? album.title.substring(0, 17) + '...' : album.title;
                const artist = album.artist.length > 20 ? album.artist.substring(0, 17) + '...' : album.artist;
                const releaseDate = new Date(album.releaseDate).toLocaleDateString();
                const daysSinceRelease = Math.floor((new Date() - new Date(album.releaseDate)) / (1000 * 60 * 60 * 24));

                let timeLabel = '';
                if (daysSinceRelease === 0) {
                    timeLabel = 'Today';
                } else if (daysSinceRelease === 1) {
                    timeLabel = 'Yesterday';
                } else if (daysSinceRelease <= 7) {
                    timeLabel = `${daysSinceRelease} days ago`;
                } else if (daysSinceRelease <= 30) {
                    timeLabel = `${Math.floor(daysSinceRelease / 7)} weeks ago`;
                } else {
                    timeLabel = releaseDate;
                }

                // Display score if available, otherwise show rating prompt
                let ratingDisplay = '';
                if (album.score) {
                    ratingDisplay = `<span style="color: var(--primary); font-size: 0.9rem; font-weight: bold;">★ ${album.score}/10</span>`;
                } else {
                    ratingDisplay = '<span style="color: var(--primary); font-size: 0.7rem;">Click to rate</span>';
                }

                // Use same styling as static cards - no inline styles, rely on CSS classes
                html += `<div class="scroll-item" onclick="rateAlbumFromNewRelease('${album.id}')" style="cursor: pointer;">
                    <div class="news-title-card">
                        <h2>${title}</h2>
                    </div>
                    <div class="news-content-card">
                        <p class="date">${artist}</p>
                        ${album.imageUrl ? `<img src="${album.imageUrl}" alt="${album.title} cover">` : '<div style="width: 100%; height: 120px; background: var(--card-background); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-music" style="font-size: 2rem; opacity: 0.5;"></i></div>'}
                        <p style="font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">${timeLabel}</p>
                        <p style="margin-top: 0.25rem;">${ratingDisplay}</p>
                    </div>
                </div>`;
            });

            scrollContainer.innerHTML = html;
        } else {
            scrollContainer.innerHTML = `<div class="scroll-item" style="text-align: center; padding: 2rem; border: none; background: #000; color: white;">
                <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: #666;"></i>
                <p>No new releases in the last 30 days.</p>
            </div>`;
        }
    } catch (error) {
        console.error('Failed to load new releases:', error);
        const scrollContainer = document.getElementById('new-releases-scroll');
        scrollContainer.innerHTML = `<div class="scroll-item" style="text-align: center; padding: 2rem; border: none; background: #000; color: white;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
            <p>Unable to load new releases at this time.</p>
        </div>`;
    }
}

// Rate album from new releases section
async function rateAlbumFromNewRelease(albumId) {
    // Redirect to tools page with the album ID
    window.location.href = `tools.html?rate=${albumId}`;
}

// Load underground artists for the index page
async function loadUndergroundArtists() {
    try {
        const response = await fetch('/api/underground-rankings');
        if (!response.ok) {
            throw new Error(`Failed to load underground artists: ${response.status}`);
        }

        const undergroundArtists = await response.json();
        const scrollContainer = document.getElementById('underground-artists-scroll');
        const loadingElement = document.getElementById('underground-loading');

        // Hide loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (undergroundArtists.length > 0) {
            let html = '';
            // Show top 20 underground artists
            const topArtists = undergroundArtists.slice(0, 20);

            topArtists.forEach((artist) => {
                const name = artist.name.length > 15 ? artist.name.substring(0, 12) + '...' : artist.name;
                const monthlyListeners = artist.monthlyListeners ? artist.monthlyListeners.toLocaleString() : 'N/A';

                html += `<a href="underground-rankings.html" class="scroll-item" style="text-decoration: none;">
                    <div class="news-title-card">
                        <h2>${name}</h2>
                    </div>
                    <div class="news-content-card">
                        ${artist.imageUrl ? `<img src="${artist.imageUrl}" alt="${artist.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjYwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+QXJ0aXN0PC90ZXh0Pgo8L3N2Zz4='">` : '<div style="width: 100%; height: 120px; background: var(--card-background); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="font-size: 2rem; opacity: 0.5;"></i></div>'}
                        <p style="font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">${monthlyListeners} monthly listeners</p>
                    </div>
                </a>`;
            });

            scrollContainer.innerHTML = html;
        } else {
            scrollContainer.innerHTML = `<div class="scroll-item" style="text-align: center; padding: 2rem; border: none;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No underground artists available at this time.</p>
            </div>`;
        }
    } catch (error) {
        console.error('Failed to load underground artists:', error);
        const scrollContainer = document.getElementById('underground-artists-scroll');
        const loadingElement = document.getElementById('underground-loading');

        if (loadingElement) {
            loadingElement.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
                <p>Unable to load underground artists at this time.</p>
            `;
        }
    }
}

// Load latest news for the index page
async function loadLatestNews() {
    try {
        const response = await fetch('/api/news?limit=10');
        if (!response.ok) {
            throw new Error(`Failed to load news: ${response.status}`);
        }

        const newsArticles = await response.json();
        const scrollContainer = document.getElementById('news-scroll');
        const loadingElement = document.getElementById('news-loading');

        // Hide loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (newsArticles.length > 0) {
            let html = '';
            // Show latest 10 news articles
            newsArticles.forEach((article) => {
                const title = article.title.length > 25 ? article.title.substring(0, 22) + '...' : article.title;
                const source = article.source || 'MusicRx';
                const publishedDate = new Date(article.publishedAt).toLocaleDateString();

                html += `<a href="${article.url}" target="_blank" class="scroll-item" style="text-decoration: none;">
                    <div class="news-title-card">
                        <h2>${title}</h2>
                    </div>
                    <div class="news-content-card">
                        <p class="date">${source}</p>
                        ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">` : '<div style="width: 100%; height: 120px; background: var(--card-background); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-newspaper" style="font-size: 2rem; opacity: 0.5;"></i></div>'}
                        <p style="font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">${publishedDate}</p>
                    </div>
                </a>`;
            });

            scrollContainer.innerHTML = html;
        } else {
            scrollContainer.innerHTML = `<div class="scroll-item" style="text-align: center; padding: 2rem; border: none;">
                <i class="fas fa-newspaper" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No news available at this time.</p>
            </div>`;
        }
    } catch (error) {
        console.error('Failed to load latest news:', error);
        const scrollContainer = document.getElementById('news-scroll');
        const loadingElement = document.getElementById('news-loading');

        if (loadingElement) {
            loadingElement.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
                <p>Unable to load latest news at this time.</p>
            `;
        }
    }
}

// Load AOTY contenders for the index page
async function loadAOTYContenders() {
    try {
        const response = await fetch('/api/aoty-contenders');
        if (!response.ok) {
            throw new Error(`Failed to load AOTY contenders: ${response.status}`);
        }

        const aotyContenders = await response.json();
        const scrollContainer = document.getElementById('aoty-contenders-scroll');
        const loadingElement = document.getElementById('aoty-loading');

        // Hide loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (aotyContenders.length > 0) {
            let html = '';
            // Show top 10 AOTY contenders
            const topContenders = aotyContenders.slice(0, 10);

            topContenders.forEach((album) => {
                const title = album.title.length > 15 ? album.title.substring(0, 12) + '...' : album.title;
                const artist = album.artist.length > 15 ? album.artist.substring(0, 12) + '...' : album.artist;
                const score = album.score ? `${album.score}/10` : 'N/A';

                html += `<a href="all-2025-albums.html" class="scroll-item" style="text-decoration: none;">
                    <div class="news-title-card">
                        <h2>${title}</h2>
                    </div>
                    <div class="news-content-card">
                        <p class="date">${artist}</p>
                        ${album.imageUrl ? `<img src="${album.imageUrl}" alt="${album.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">` : '<div style="width: 100%; height: 120px; background: var(--card-background); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-music" style="font-size: 2rem; opacity: 0.5;"></i></div>'}
                        <p style="font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">${score}</p>
                    </div>
                </a>`;
            });

            scrollContainer.innerHTML = html;
        } else {
            scrollContainer.innerHTML = `<div class="scroll-item" style="text-align: center; padding: 2rem; border: none;">
                <i class="fas fa-trophy" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No AOTY contenders available at this time.</p>
            </div>`;
        }
    } catch (error) {
        console.error('Failed to load AOTY contenders:', error);
        const scrollContainer = document.getElementById('aoty-contenders-scroll');
        const loadingElement = document.getElementById('aoty-loading');

        if (loadingElement) {
            loadingElement.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
                <p>Unable to load AOTY contenders at this time.</p>
            `;
        }
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

// Initialize Three.js starfield components
function initStarfield() {
    if (!scene || !camera || !renderer) {
        console.error('Three.js components not initialized.');
        return;
    }
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < starCount; i++) {
        vertices.push(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );

        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.2) {
            color = new THREE.Color(0xffffff);
        } else if (colorChoice < 0.4) {
            color = new THREE.Color(0x00ffff);
        } else if (colorChoice < 0.6) {
            color = new THREE.Color(0xff00ff);
        } else if (colorChoice < 0.8) {
            color = new THREE.Color(0xffff00);
        } else {
            color = new THREE.Color(0x7f00ff);
        }
        color.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
        colors.push(color.r, color.g, color.b);
        sizes.push(Math.random() * 2 + 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    let material;
    if (useSimpleShader) {
        material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    } else {
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                cursorPos: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform vec2 cursorPos;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(cursorPos - gl_Position.xy);
                    float scale = sin(time + dist * 0.05) * 0.5 + 1.5;
                    gl_PointSize = size * scale * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0 - (dist * 2.0));
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }

    starField = new THREE.Points(geometry, material);
    scene.add(starField);

    if (!isMobile) {
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
            mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
            if (!useSimpleShader) {
                material.uniforms.cursorPos.value.set(
                    (e.clientX / window.innerWidth) * 2 - 1,
                    -(e.clientY / window.innerHeight) * 2 + 1
                );
            }
        });
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        if (starField && window.isStarfieldActive) {
            targetX += (mouseX - targetX) * 0.02;
            targetY += (mouseY - targetY) * 0.02;
            starField.rotation.x += 0.0002 + targetY * 0.05;
            starField.rotation.y += 0.0003 + targetX * 0.05;
            if (!useSimpleShader) {
                starField.material.uniforms.time.value += 0.01;
            }
            const time = Date.now() * 0.001;
            starField.scale.setScalar(Math.sin(time * 0.5) * 0.05 + 1);
            renderer.render(scene, camera);
        }
    }
    animate();
}

// Initialize Three.js and setup starfield
function initThreeJS() {
    try {
        const canvas = document.getElementById('universe');
        if (!canvas) {
            console.error('Universe canvas not found.');
            return;
        }

        if (renderer) {
            renderer.dispose();
            canvas.removeChild(renderer.domElement);
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: !isMobile // Disable antialiasing on mobile
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
        renderer.setClearColor(0x000000, 0);
        camera.position.z = 1000;

        initStarfield();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        canvas.addEventListener('webglcontextlost', (e) => {
            console.warn('WebGL context lost:', e);
            cancelAnimationFrame(animationFrameId);
        });

        canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored. Reinitializing starfield.');
            initThreeJS();
        });

        console.log('Starfield initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Three.js:', err);
    }
}

// Update starfield colors based on CSS theme
function updateStarfieldColors() {
    if (!starField || !starField.geometry.attributes.color) {
        console.warn('Starfield not initialized or geometry not found.');
        return;
    }
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue('--primary').trim();
    const baseColor = new THREE.Color(primaryColor);
    const colorArray = starField.geometry.attributes.color.array;
    for (let i = 0; i < colorArray.length; i += 3) {
        const color = new THREE.Color(baseColor);
        color.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
        colorArray[i] = color.r;
        colorArray[i + 1] = color.g;
        colorArray[i + 2] = color.b;
    }
    starField.geometry.attributes.color.needsUpdate = true;
}

// Main event listener
document.addEventListener('DOMContentLoaded', () => {
  // Footer visibility logic
  const footer = document.querySelector('.footer');
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 10) {
      footer.classList.add('visible');
    } else {
      footer.classList.remove('visible');
    }
  });

    const supportsWebGL = (function() {
        try {
            return !!window.WebGLRenderingContext && 
                   !!document.createElement('canvas').getContext('webgl');
        } catch(e) {
            return false;
        }
    })();

    if (typeof themeEffects !== 'undefined') {
        themeEffects.initializeAnimations();
    }

    if (typeof hoverEffects !== 'undefined') {
        hoverEffects.init();
    }

    if (typeof scrollEffects !== 'undefined') {
        scrollEffects.init();
    }

    const universe = document.getElementById('universe');
    const starfieldToggle = document.getElementById('starfieldToggle');

    if (supportsWebGL && !isMobile) {
        initThreeJS();
        universe.style.opacity = window.isStarfieldActive ? '1' : '0';
        universe.style.display = 'block';
    } else if (supportsWebGL) {
        initThreeJS(); // Still initialize but with optimizations
        universe.style.opacity = window.isStarfieldActive ? '0.7' : '0';
        universe.style.display = 'block';
    } else {
        if (universe) universe.style.display = 'none';
        if (starfieldToggle) starfieldToggle.style.display = 'none';
        console.warn('WebGL not supported. Starfield disabled.');
    }

    if (starfieldToggle && universe) {
        starfieldToggle.style.color = window.isStarfieldActive ? 'var(--primary)' : 'var(--text-color)';
        starfieldToggle.addEventListener('click', () => {
            window.isStarfieldActive = !window.isStarfieldActive;
            localStorage.setItem('starfieldEnabled', window.isStarfieldActive);
            universe.style.opacity = window.isStarfieldActive ? (isMobile ? '0.7' : '1') : '0';
            starfieldToggle.style.color = window.isStarfieldActive ? 'var(--primary)' : 'var(--text-color)';
            if (window.isStarfieldActive && !animationFrameId) initThreeJS();
            console.log('Starfield toggled:', window.isStarfieldActive);
        });
    }

    // const cursorBlur = document.getElementById('cursor-blur');
    // if (cursorBlur && !isMobile) {
    //     cursorBlur.style.visibility = 'visible';
    //     document.addEventListener('mousemove', (e) => {
    //         requestAnimationFrame(() => {
    //             cursorBlur.style.left = `${e.clientX - 200}px`;
    //             cursorBlur.style.top = `${e.clientY - 200}px`;
    //         });
    //     });
    // } else if (cursorBlur) {
    //     cursorBlur.style.display = 'none';
    // }

    function updateCursorForTheme(theme) {
        // Cursor theme handling removed
    }

    document.querySelectorAll('.glass-card, .track-highlight-item').forEach(card => {
        card.style.background = 'rgba(255, 255, 255, 0.2)';
        card.style.backdropFilter = 'blur(10px)';
        if (!isMobile) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 0 20px var(--glow)';
                card.style.background = 'var(--rgb-glow)';
                card.style.backgroundSize = '200% 200%';
                card.style.animation = 'rgbShift 3s linear infinite';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'scale(1)';
                card.style.boxShadow = 'none';
                card.style.background = 'rgba(255, 255, 255, 0.2)';
                card.style.animation = 'none';
            });
        } else {
            card.addEventListener('touchstart', () => {
                card.style.background = 'var(--rgb-glow)';
                card.style.boxShadow = '0 0 10px var(--glow)';
            });
            card.addEventListener('touchend', () => {
                card.style.background = 'rgba(255, 255, 255, 0.3)';
                card.style.boxShadow = 'none';
            });
        }
    });

    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const defaultTheme = 'black'; // Default theme for all users

    if (themeToggle) {
        if (!localStorage.getItem('currentTheme')) {
            localStorage.setItem('currentTheme', defaultTheme);
            localStorage.setItem('currentThemeTitle', 'Black Mode');
        }
        const savedTheme = localStorage.getItem('currentTheme');
        const savedThemeTitle = localStorage.getItem('currentThemeTitle');
        htmlElement.setAttribute('data-theme', savedTheme);
        themeToggle.setAttribute('title', savedThemeTitle);
        themeToggle.setAttribute('aria-label', `Switch to next theme (current: ${savedThemeTitle})`);
        updateCursorForTheme(savedTheme);
        updateStarfieldColors();
        console.log(`Initial theme applied: ${savedTheme}`);

        const themes = [
            'black', 'all-white'
            // Commented out themes
            /*
            'primary', 'mirror-glass', 'ultra-glass', 'normal', 'satin', 'frosted', 'veazy', 'white',
            'all-red', 'all-blue', 'pink-rose', 'blue-sky',
            'yellow-beige', 'green', 'purple-lavender', 'vogue', 'neon-future',
            'midnight-gold', 'desert-oasis', 'cyber-punk', 'aurora-breeze', 'glass-morphism',
            'galactic-nebula', 'electric-storm', 'void-pulse', 'prism-shard',
            'inferno-core', 'cosmic-rift', 'neon-eclipse', 'quantum-flux',
            'holo-abyss', 'spectral-surge', 'starforge-nebula', 'thunder-vortex',
            'abyss-echo', 'crystal-prism', 'magma-forge', 'dimensional-veil',
            'shadow-pulse', 'flux-horizon', 'holo-vortex', 'waveform-surge'
            */
        ];

        const themeTitles = [
            'Black Mode', 'All White Mode'
            // Commented out theme titles
            /*
            'Primary Mode', 'Mirror Glass Mode', 'Ultra Glass Mode', 'Normal Mode', 'Satin Mode', 'Frosted Mode', 'Veazy Mode', 'White Mode',
            'All Red Mode', 'All Blue Mode', 'Pink Rose Mode', 'Blue Sky Mode',
            'Yellow Beige Mode', 'Green Mode', 'Purple Lavender Mode', 'Vogue Mode', 'Neon Future Mode',
            'Midnight Gold Mode', 'Desert Oasis Mode', 'Cyber Punk Mode', 'Aurora Breeze Mode', 'Glass Morphism Mode',
            'Galactic Nebula Mode', 'Electric Storm Mode', 'Void Pulse Mode', 'Prism Shard Mode',
            'Inferno Core Mode', 'Cosmic Rift Mode', 'Neon Eclipse Mode', 'Quantum Flux Mode',
            'Holo Abyss Mode', 'Spectral Surge Mode', 'Starforge Nebula Mode', 'Thunder Vortex Mode',
            'Abyss Echo Mode', 'Crystal Prism Mode', 'Magma Forge Mode', 'Dimensional Veil Mode',
            'Shadow Pulse Mode', 'Flux Horizon Mode', 'Holo Vortex Mode', 'Waveform Surge Mode'
            */
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
            updateCursorForTheme(newTheme);

            updateStarfieldColors();
            console.log(`Theme changed to: ${newTheme}`);
        });
    } else {
        console.warn('Theme toggle button not found.');
    }

    const modals = document.querySelectorAll('.wallet-modal-overlay, .tip-overlay');
    if (modals.length > 0) {
        modals.forEach(modal => {
            if (modal) {
                modal.addEventListener('transitionend', () => {
                    if (modal.classList.contains('active')) {
                //if (cursorBlur) cursorBlur.style.display = 'none';
                window.isStarfieldActive = false;
                universe.style.opacity = '0';
            } else {
                //if (cursorBlur && !isMobile) cursorBlur.style.display = 'block';
                window.isStarfieldActive = localStorage.getItem('starfieldEnabled') === 'true';
                universe.style.opacity = window.isStarfieldActive ? (isMobile ? '0.7' : '1') : '0';
            }
                    document.querySelectorAll('.scroll-container, .glass-card').forEach(el => {
                        if (el) {
                            el.style.visibility = 'visible';
                            el.style.opacity = '1';
                        }
                    });
                });
            }
        });
    }

    document.querySelectorAll('.scroll-container, .glass-card').forEach(el => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
    });

    // Function to wrap each character in a span
    function wrapChars() {
      const elements = document.querySelectorAll('h1, h2, h3, p');
      elements.forEach(element => {
        const words = element.textContent.split(' ');
        element.textContent = '';

        words.forEach((word, wordIndex) => {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'word';

          // Commented out letter glitch effect
/*word.split('').forEach((char, charIndex) => {
            const span = document.createElement('span');
            span.className = 'char glitch-hover';
            span.textContent = char;
            wordSpan.appendChild(span);
          });*/
wordSpan.textContent = word;

          element.appendChild(wordSpan);

          // Add space between words
          if (wordIndex < words.length - 1) {
            const space = document.createElement('span');
            space.className = 'space';
            space.textContent = ' ';
            element.appendChild(space);
          }
        });
      });
    }
    wrapChars(); //Call the function after DOMContentLoaded

    // Load new releases for the index page with periodic updates
    if (document.getElementById('new-releases-scroll')) {
        loadNewReleases();
        // Refresh new releases every 5 minutes to show latest releases
        setInterval(loadNewReleases, 5 * 60 * 1000); // 5 minutes
    }

    // Load underground artists for the index page
    if (document.getElementById('underground-artists-scroll')) {
        loadUndergroundArtists();
    }

    // Load AOTY contenders for the index page
    if (document.getElementById('aoty-contenders-scroll')) {
        loadAOTYContenders();
    }

    // Load latest news for the index page
    if (document.getElementById('news-scroll')) {
        loadLatestNews();
    }

});

// Search functionality for reviews and features pages
function initializeSearch() {
    const reviewSearch = document.getElementById('reviewSearch');
    const featureSearch = document.getElementById('featureSearch');

    if (reviewSearch) {
        const cards = document.querySelectorAll('.scroll-item');
        reviewSearch.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            cards.forEach(card => {
                const artistName = card.querySelector('.news-title-card h2')?.textContent.toLowerCase() || '';
                const rating = card.querySelector('.rating')?.textContent.toLowerCase() || '';
                const shouldShow = artistName.includes(searchTerm) || rating.includes(searchTerm);
                card.style.display = shouldShow ? 'flex' : 'none';
                card.style.opacity = shouldShow ? '1' : '0';
                card.style.transition = 'opacity 0.3s ease';
            });
        }, 300));
    }

    if (featureSearch) {
        const cards = document.querySelectorAll('.scroll-item');
        featureSearch.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            cards.forEach(card => {
                const artistName = card.querySelector('.news-title-card h2')?.textContent.toLowerCase() || '';
                const rating = card.querySelector('.rating')?.textContent.toLowerCase() || '';
                const shouldShow = artistName.includes(searchTerm) || rating.includes(searchTerm);
                card.style.display = shouldShow ? 'flex' : 'none';
                card.style.opacity = shouldShow ? '1' : '0';
                card.style.transition = 'opacity 0.3s ease';
            });
        }, 300));
    }
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSearch);

// Dropdown Functionality
document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    const menu = toggle.nextElementSibling;
    if (!menu) {
        console.warn('Dropdown menu not found for toggle:', toggle);
        return;
    }
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu.active').forEach(m => {
            if (m !== menu) m.classList.remove('active');
        });
        menu.classList.toggle('active');
    });
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});

// Magic Search Functionality
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
        if (e.key === 'Enter' && magicInput.value.trim()) {
            const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
            magicAnswer.textContent = randomAnswer;
        } else if (e.key === 'Enter') {
            magicAnswer.textContent = "Ask me something first!";
        }
    });
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
}

// Back to Top Button
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', () => {
        backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
}

// GSAP Animations
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.glass-card').forEach(item => {
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

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]:not(.dropdown-toggle)').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const section = document.querySelector(this.getAttribute('href'));
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Custom Paint API for Neon Drip Effect
if ('paintWorklet' in CSS) {
    const neonDripWorklet = `
        registerPaint('neon-drip', class {
            static get inputProperties() {
                return ['--drip-offset', '--drip-speed', '--drip-color', '--primary', '--glow', '--background-color'];
            }
            paint(ctx, size, properties) {
                const dripOffset = parseFloat(properties.get('--drip-offset')) || 0;
                const dripSpeed = parseFloat(properties.get('--drip-speed')) || 1;
                const dripColor = properties.get('--drip-color').toString() || properties.get('--primary').toString();
                const glowColor = properties.get('--glow').toString();
                const { width, height } = size;

                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, dripColor);
                gradient.addColorStop(1, glowColor);

                ctx.fillStyle = gradient;
                ctx.globalAlpha = 0.6;

                const spacing = Math.max(10, width / 100);
                for (let x = 0; x < width; x += spacing) {
                    const wave = Math.sin(x * 0.05 + dripOffset) * 15;
                    const y = height / 2 + wave;

                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();

                    for (let i = 1; i <= 3; i++) {
                        ctx.globalAlpha = 0.15 / i;
                        ctx.beginPath();
                        ctx.arc(x, y - i * 10, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
    `;
    const blob = new Blob([neonDripWorklet], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    CSS.paintWorklet.addModule(url).catch(err => console.error('Failed to load Neon Drip Worklet:', err));
}

// News Ticker Functionality
document.addEventListener('DOMContentLoaded', () => {
    const ticker = document.querySelector('.ticker-content');
    if (ticker) {
        ticker.addEventListener('mouseenter', () => {
            ticker.style.animationPlayState = 'paused';
        });

        ticker.addEventListener('mouseleave', () => {
            ticker.style.animationPlayState = 'running';
        });

        // Clone ticker content for seamless loop
        const clone = ticker.cloneNode(true);
        ticker.parentNode.appendChild(clone);
    }
});
