
const THREE = window.THREE;

let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
let cursorLight;

// Make initStarfield globally available
window.initStarfield = function() {
    if (!window.scene) {
        window.scene = new THREE.Scene();
    }
    if (!window.camera) {
        window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    }
    if (!window.renderer) {
        window.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('universe'),
            alpha: true,
            antialias: true
        });
    }

    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    window.camera.position.z = 1000;

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];
    const starCount = 15000;

    // Generate varied star colors
    for (let i = 0; i < starCount; i++) {
        vertices.push(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );

        // Create varied colors
        const colorChoice = Math.random();
        let color;

        if (colorChoice < 0.2) {
            color = new THREE.Color(0xffffff); // White
        } else if (colorChoice < 0.4) {
            color = new THREE.Color(0x00ffff); // Cyan
        } else if (colorChoice < 0.6) {
            color = new THREE.Color(0xff00ff); // Magenta
        } else if (colorChoice < 0.8) {
            color = new THREE.Color(0xffff00); // Yellow
        } else {
            color = new THREE.Color(0x7f00ff); // Purple
        }

        // Add slight random variation to colors
        color.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);

        colors.push(color.r, color.g, color.b);
        sizes.push(Math.random() * 2 + 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Custom shader material
    const material = new THREE.ShaderMaterial({
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

    window.starField = new THREE.Points(geometry, material);
    window.scene.add(window.starField);

    // Add cursor light
    const lightGeometry = new THREE.SphereGeometry(2, 32, 32);
    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });
    cursorLight = new THREE.PointLight(0xffffff, 2, 100);
    cursorLight.add(new THREE.Mesh(lightGeometry, lightMaterial));
    window.scene.add(cursorLight);

    // Enhanced mouse movement handling
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
        mouseY = (e.clientY - window.innerHeight / 2) * 0.001;

        // Update cursor light position
        const vector = new THREE.Vector3(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1,
            0.5
        );
        vector.unproject(window.camera);
        cursorLight.position.set(vector.x * 100, vector.y * 100, 50);

        // Update shader uniform
        material.uniforms.cursorPos.value.set(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
    });

    // Handle resize
    window.addEventListener('resize', () => {
        window.camera.aspect = window.innerWidth / window.innerHeight;
        window.camera.updateProjectionMatrix();
        window.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;

    if (window.starField) {
        window.starField.rotation.x += 0.0002 + targetY * 0.05;
        window.starField.rotation.y += 0.0003 + targetX * 0.05;

        window.starField.material.uniforms.time.value += 0.01;

        const time = Date.now() * 0.001;
        window.starField.scale.setScalar(Math.sin(time * 0.5) * 0.05 + 1);
    }

    window.renderer.render(window.scene, window.camera);
}

