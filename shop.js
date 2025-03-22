document.addEventListener("DOMContentLoaded", () => {
    // Web3 Wallet and Transaction Logic
    const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
    const solConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
    const myEthAddress = "0x24A77F76fe0CF427f26A9E49F33f7E9287217250";
    const mySolAddress = "9ahtvae2NGuvJLV4P4F8rSMKTxh7XEoWZ8wR3wEV3N1Z"; // Updated SOL address
    let connectedChain = null;
    let connectedAddress = null; // Added to track connected wallet

    async function connectWallet() {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const signer = ethProvider.getSigner();
                const address = await signer.getAddress();
                connectedAddress = address; // Store the connected address
                document.getElementById("walletAddress").innerText = `ETH Connected: ${address.slice(0, 6)}...`;
                connectedChain = "eth";
                showEthButtons();
            } catch (error) {
                console.error("ETH connection failed:", error);
                alert("ETH connection failed: " + error.message);
            }
        } else if (window.solana && window.solana.isPhantom) {
            try {
                await window.solana.connect();
                const address = window.solana.publicKey.toString();
                connectedAddress = address; // Store the connected address
                document.getElementById("walletAddress").innerText = `SOL Connected: ${address.slice(0, 6)}...`;
                connectedChain = "sol";
                showSolButtons();
            } catch (error) {
                console.error("SOL connection failed:", error);
                alert("SOL connection failed: " + error.message);
            }
        } else {
            alert("Please install MetaMask or Phantom wallet!");
        }
    }

    function showEthButtons() {
        document.getElementById("buyTeeEth")?.style.display = "block";
        document.getElementById("buyAlbumEth")?.style.display = "block";
        document.getElementById("tipEth")?.style.display = "block";
        document.getElementById("buyTeeSol")?.style.display = "none";
        document.getElementById("buyAlbumSol")?.style.display = "none";
        document.getElementById("tipSol")?.style.display = "none";
    }

    function showSolButtons() {
        document.getElementById("buyTeeSol")?.style.display = "block";
        document.getElementById("buyAlbumSol")?.style.display = "block";
        document.getElementById("tipSol")?.style.display = "block";
        document.getElementById("buyTeeEth")?.style.display = "none";
        document.getElementById("buyAlbumEth")?.style.display = "none";
        document.getElementById("tipEth")?.style.display = "none";
    }

    async function sendEth(amount, item) {
        if (connectedChain !== "eth") return alert("Connect an ETH wallet first!");
        try {
            const signer = ethProvider.getSigner();
            const tx = await signer.sendTransaction({
                to: myEthAddress,
                value: ethers.utils.parseEther(amount),
            });
            await tx.wait();
            alert(`Thanks for buying ${item} with ${amount} ETH!`);
            createTipEffect(); // Add visual effect after successful transaction
        } catch (error) {
            alert(`ETH transaction failed: ${error.message}`);
        }
    }

    async function sendSol(amount, item) {
        if (connectedChain !== "sol") return alert("Connect a SOL wallet first!");
        try {
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: window.solana.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(mySolAddress),
                    lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
                })
            );
            const { signature } = await window.solana.signAndSendTransaction(transaction);
            await solConnection.confirmTransaction(signature);
            alert(`Thanks for ${item === "donation" ? "donating" : "buying"} ${item} with ${amount} SOL!`);
            createTipEffect(); // Add visual effect after successful transaction
        } catch (error) {
            alert(`SOL transaction failed: ${error.message}`);
        }
    }

    // Event Listeners for Web3 Buttons
    document.getElementById("connectWallet")?.addEventListener("click", connectWallet);
    document.getElementById("buyTeeEth")?.addEventListener("click", () => sendEth("0.05", "MusicRX Tee"));
    document.getElementById("buyTeeSol")?.addEventListener("click", () => sendSol(0.1, "MusicRX Tee"));
    document.getElementById("buyAlbumEth")?.addEventListener("click", () => sendEth("0.03", "Digital Album"));
    document.getElementById("buyAlbumSol")?.addEventListener("click", () => sendSol(0.07, "Digital Album"));
    document.getElementById("tipEth")?.addEventListener("click", () => {
        const amount = document.getElementById('ethAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        sendEth(amount, "donation");
    });
    document.getElementById("tipSol")?.addEventListener("click", () => {
        const amount = document.getElementById('solAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        sendSol(amount, "donation");
    });
    document.getElementById("tipBtc")?.addEventListener("click", () => {
        const amount = document.getElementById('btcAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        alert("BTC tipping is not yet Web3-integrated. Coming soon!");
        createTipEffect(); // Add visual effect for consistency
    });

    // Visual effect for tipping
    function createTipEffect() {
        for (let i = 0; i < 20; i++) {
            const coin = document.createElement('div');
            coin.style.position = 'fixed';
            coin.style.width = '20px';
            coin.style.height = '20px';
            coin.style.background = 'radial-gradient(circle at center, #ffd700, #cc9900)';
            coin.style.borderRadius = '50%';
            coin.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
            coin.style.top = '-50px';
            coin.style.left = Math.random() * window.innerWidth + 'px';
            coin.style.zIndex = '9999';

            document.body.appendChild(coin);

            const duration = Math.random() * 2 + 1;
            const delay = Math.random() * 0.5;

            gsap.to(coin, {
                top: window.innerHeight + 50,
                rotation: Math.random() * 360,
                scale: Math.random() * 0.5 + 0.5,
                opacity: 0,
                duration: duration,
                delay: delay,
                ease: 'power1.in',
                onComplete: () => {
                    document.body.removeChild(coin);
                }
            });
        }

        const jar = document.querySelector('.jar');
        if (jar) {
            gsap.to(jar, {
                rotation: 10,
                duration: 0.1,
                repeat: 5,
                yoyo: true,
                ease: 'power1.inOut'
            });
        }
    }

    // Custom Cursor
    const cursor = document.getElementById('cursor');
    const cursorBlur = document.getElementById('cursor-blur');
    let cursorX = 0, cursorY = 0;
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
    });

    function updateCursor() {
        requestAnimationFrame(updateCursor);
        if (cursor) cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        if (cursorBlur) cursorBlur.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    }
    updateCursor();

    // Three.js Background
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('universe'), alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

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

    const material = new THREE.PointsMaterial({ size: 1, vertexColors: true, transparent: true, opacity: 0.8 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    camera.position.z = 1000;

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
        mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
    });

    function animate() {
        requestAnimationFrame(animate);
        points.rotation.x += 0.0002;
        points.rotation.y += 0.0003;
        points.rotation.x += (mouseY - points.rotation.x) * 0.05;
        points.rotation.y += (mouseX - points.rotation.y) * 0.05;
        const time = Date.now() * 0.001;
        points.scale.x = points.scale.y = points.scale.z = Math.sin(time) * 0.15 + 1;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Hover Sound Effects
    function playRandomSound() {
        const sounds = [
            document.getElementById('hover-sound-1'),
            document.getElementById('hover-sound-2'),
            document.getElementById('hover-sound-3')
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        sound.currentTime = 0;
        sound.volume = 0.2;
        sound.play();
    }

    document.querySelectorAll('.button, .glass-card').forEach(element => {
        element.addEventListener('mouseenter', playRandomSound);
    });

    // GSAP Animations
    gsap.registerPlugin(ScrollTrigger);
    gsap.fromTo('.glass-card', 
        { y: 100, opacity: 0, rotation: 5 },
        { 
            y: 0, 
            opacity: 1, 
            rotation: 0, 
            duration: 1.2, 
            ease: 'elastic.out(1, 0.75)', 
            stagger: 0.2, 
            delay: 0.5
        }
    );
});
