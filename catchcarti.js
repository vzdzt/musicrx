
// Game variables
let gameInitialized = false;
let score = 0;
let gameAnimation = null;
let gameStarted = false;
let gameLevel = 1;
let lives = 3;
let gamePaused = false;
let gameOver = false;
let carti;
let gameContainer;
let lastSpawnTime = 0;
let lastEnemyTime = 0;
let lastShootTime = 0;
let lastGroupTime = 0;
let lastPowerupTime = 0;
const fallingItems = [];
const enemies = [];
const bullets = [];
const powerups = [];
const bulletSpeed = 10;
const shootCooldown = 300;
let moveLeft = false;
let moveRight = false;
const starParticles = [];
const explosions = [];
let invincible = false;
let rapidFire = false;
let powerupTimer = 0;
let highScores = [];
let gameState = "menu";
let sounds = {};
let bulletType = "normal";
let soundsMuted = false;

// Global method for muting sounds
window.muteSounds = function() {
    soundsMuted = true;
    if (sounds.background) {
        sounds.background.pause();
    }
};

// Global method for unmuting sounds
window.unmuteSounds = function() {
    soundsMuted = false;
    if (sounds.background && gameState === "playing") {
        sounds.background.play().catch(e => console.log("Background music play prevented:", e));
    }
};

// Load high scores from localStorage
function loadHighScores() {
    try {
        const savedScores = localStorage.getItem('catchCartiHighScores');
        if (savedScores) {
            highScores = JSON.parse(savedScores);
        } else {
            // Default high scores
            highScores = [
                { name: "CARTI", score: 1000 },
                { name: "OPIUM", score: 800 },
                { name: "VAMP", score: 600 },
                { name: "KING", score: 400 },
                { name: "SLATT", score: 200 }
            ];
            saveHighScores();
        }
    } catch (e) {
        console.log("Error loading high scores:", e);
        highScores = [
            { name: "CARTI", score: 1000 },
            { name: "OPIUM", score: 800 },
            { name: "VAMP", score: 600 },
            { name: "KING", score: 400 },
            { name: "SLATT", score: 200 }
        ];
    }
}

// Save high scores to localStorage
function saveHighScores() {
    try {
        localStorage.setItem('catchCartiHighScores', JSON.stringify(highScores));
    } catch (e) {
        console.log("Error saving high scores:", e);
    }
}

// Add a new high score
function addHighScore(name, newScore) {
    highScores.push({ name, score: newScore });
    // Sort by score (highest first)
    highScores.sort((a, b) => b.score - a.score);
    // Keep only top 5
    if (highScores.length > 5) {
        highScores = highScores.slice(0, 5);
    }
    saveHighScores();
}

// Check if a score qualifies for high scores
function isHighScore(newScore) {
    return highScores.length < 5 || newScore > highScores[highScores.length - 1].score;
}

// Load sounds
function loadSounds() {
    sounds = {
        shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/212/212.wav'),
        explosion: new Audio('https://assets.mixkit.co/active_storage/sfx/250/250.wav'),
        pickup: new Audio('https://assets.mixkit.co/active_storage/sfx/270/270.wav'),
        powerup: new Audio('https://assets.mixkit.co/active_storage/sfx/555/555.wav'),
        damage: new Audio('https://assets.mixkit.co/active_storage/sfx/240/240.wav'),
        gameOver: new Audio('https://assets.mixkit.co/active_storage/sfx/583/583.wav'),
        levelUp: new Audio('https://assets.mixkit.co/active_storage/sfx/888/888.wav'),
        background: new Audio('https://od.lk/s/MzhfMjg2NDUwNDlf/vamp%20sample.mp3')
    };

    // Set volume for all sounds
    Object.values(sounds).forEach(sound => {
        if (sound) {
            sound.volume = 0.3;
        }
    });

    // Background music should loop and be quieter
    if (sounds.background) {
        sounds.background.loop = true;
        sounds.background.volume = 0.1;
    }
}

// Play a sound with error handling
function playSound(soundName) {
    if (soundsMuted) return;
    
    try {
        if (sounds[soundName]) {
            // Clone the sound to allow overlapping playback
            const soundClone = sounds[soundName].cloneNode();
            soundClone.volume = sounds[soundName].volume;
            soundClone.play().catch(e => console.log("Sound play prevented:", e));
        }
    } catch (err) {
        console.log("Sound system error:", err);
    }
}

function initCatchCarti() {
    // Get game container
    gameContainer = document.getElementById('catch-carti-container');
    if (!gameContainer) {
        console.log("Game container not found");
        return;
    }

    // Load high scores
    loadHighScores();

    // Load sounds
    loadSounds();

    // Set up game elements
    gameContainer.style.position = 'relative';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '600px';
    gameContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameContainer.style.backgroundImage = 'none';
    gameContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameContainer.style.backgroundSize = 'cover';
    gameContainer.style.backgroundPosition = 'center';
    gameContainer.style.overflow = 'hidden';
    gameContainer.style.border = '2px solid #ff00f7';
    gameContainer.style.borderRadius = '10px';
    gameContainer.style.boxShadow = '0 0 20px rgba(255, 0, 247, 0.4)';

    // Create main menu first
    createMainMenu();

    // Create starfield background
    createStarfield();

    // Mark as initialized
    gameInitialized = true;
}

// Create a start menu
function createMainMenu() {
    if (!gameContainer) return;
    
    // Clear container
    gameContainer.innerHTML = '';

    // Set game state
    gameState = "menu";

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.style.position = 'absolute';
    menuContainer.style.width = '100%';
    menuContainer.style.height = '100%';
    menuContainer.style.display = 'flex';
    menuContainer.style.flexDirection = 'column';
    menuContainer.style.justifyContent = 'center';
    menuContainer.style.alignItems = 'center';
    menuContainer.style.background = 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(10, 0, 20, 0.9))';
    menuContainer.style.zIndex = '100';

    // Create title
    const title = document.createElement('h1');
    title.textContent = 'CATCH CARTI';
    title.style.color = '#ff00f7';
    title.style.fontFamily = '"Syncopate", sans-serif';
    title.style.fontSize = '48px';
    title.style.marginBottom = '30px';
    title.style.textShadow = '0 0 20px #ff00f7';
    title.style.letterSpacing = '5px';

    // Small bounce animation
    title.style.animation = 'titleBounce 2s infinite';
    const style = document.createElement('style');
    style.textContent = `
        @keyframes titleBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

    // Create start button
    const startButton = createMenuButton('START GAME');
    startButton.addEventListener('click', () => {
        startGame();
        playSound('pickup');
    });

    // Create high scores button
    const highScoresButton = createMenuButton('HIGH SCORES');
    highScoresButton.addEventListener('click', () => {
        showHighScores();
        playSound('pickup');
    });

    // Create instructions button
    const instructionsButton = createMenuButton('INSTRUCTIONS');
    instructionsButton.addEventListener('click', () => {
        showInstructions();
        playSound('pickup');
    });

    // Add Carti emoji
    const cartiEmoji = document.createElement('div');
    cartiEmoji.innerHTML = '🧛🏿‍♂️';
    cartiEmoji.style.fontSize = '100px';
    cartiEmoji.style.marginBottom = '20px';
    cartiEmoji.style.filter = 'drop-shadow(0 0 10px rgba(255, 0, 247, 0.7))';

    // Add falling items
    const itemsContainer = document.createElement('div');
    itemsContainer.style.position = 'absolute';
    itemsContainer.style.top = '0';
    itemsContainer.style.left = '0';
    itemsContainer.style.width = '100%';
    itemsContainer.style.height = '100%';
    itemsContainer.style.pointerEvents = 'none';
    itemsContainer.style.zIndex = '1';

    // Add falling items
    const items = ['❤️', '💰', '🧟‍♂️', '💿'];
    for (let i = 0; i < 20; i++) {
        const item = document.createElement('div');
        item.textContent = items[Math.floor(Math.random() * items.length)];
        item.style.position = 'absolute';
        item.style.left = `${Math.random() * 100}%`;
        item.style.top = `${Math.random() * 100}%`;
        item.style.fontSize = `${Math.random() * 20 + 20}px`;
        item.style.opacity = '0.5';
        item.style.animation = `fall ${Math.random() * 10 + 5}s linear infinite`;
        item.style.filter = 'blur(1px)';
        itemsContainer.appendChild(item);
    }

    // Add falling animation style
    const fallStyle = document.createElement('style');
    fallStyle.textContent = `
        @keyframes fall {
            from { transform: translateY(-100px); }
            to { transform: translateY(600px); }
        }
    `;
    document.head.appendChild(fallStyle);

    // Add to menu container
    menuContainer.appendChild(itemsContainer);
    menuContainer.appendChild(cartiEmoji);
    menuContainer.appendChild(title);
    menuContainer.appendChild(startButton);
    menuContainer.appendChild(highScoresButton);
    menuContainer.appendChild(instructionsButton);

    // Add to game container
    gameContainer.appendChild(menuContainer);
}

// Helper function to create menu buttons
function createMenuButton(text) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.background = 'linear-gradient(45deg, #ff00f7, #00f7ff)';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.color = 'white';
    button.style.padding = '15px 30px';
    button.style.margin = '10px';
    button.style.fontSize = '18px';
    button.style.fontFamily = '"Syncopate", sans-serif';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 0.2s';
    button.style.boxShadow = '0 0 10px rgba(255, 0, 247, 0.5)';

    // Hover effects
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 0 20px rgba(255, 0, 247, 0.8)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 0 10px rgba(255, 0, 247, 0.5)';
    });

    return button;
}

// Show high scores screen
function showHighScores() {
    if (!gameContainer) return;
    
    // Clear container
    gameContainer.innerHTML = '';

    // Create high scores container
    const scoresContainer = document.createElement('div');
    scoresContainer.style.position = 'absolute';
    scoresContainer.style.width = '100%';
    scoresContainer.style.height = '100%';
    scoresContainer.style.display = 'flex';
    scoresContainer.style.flexDirection = 'column';
    scoresContainer.style.justifyContent = 'center';
    scoresContainer.style.alignItems = 'center';
    scoresContainer.style.background = 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(10, 0, 20, 0.9))';
    scoresContainer.style.zIndex = '100';

    // Create title
    const title = document.createElement('h1');
    title.textContent = 'HIGH SCORES';
    title.style.color = '#ff00f7';
    title.style.fontFamily = '"Syncopate", sans-serif';
    title.style.fontSize = '36px';
    title.style.marginBottom = '20px';
    title.style.textShadow = '0 0 10px #ff00f7';

    // Create scores table
    const scoresTable = document.createElement('div');
    scoresTable.style.width = '80%';
    scoresTable.style.maxWidth = '500px';
    scoresTable.style.marginBottom = '30px';
    scoresTable.style.background = 'rgba(0, 0, 0, 0.5)';
    scoresTable.style.padding = '20px';
    scoresTable.style.borderRadius = '10px';
    scoresTable.style.border = '1px solid #ff00f7';
    scoresTable.style.boxShadow = '0 0 20px rgba(255, 0, 247, 0.3)';

    // Add scores
    highScores.forEach((entry, index) => {
        const scoreRow = document.createElement('div');
        scoreRow.style.display = 'flex';
        scoreRow.style.justifyContent = 'space-between';
        scoreRow.style.padding = '10px 0';
        scoreRow.style.borderBottom = index < highScores.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none';

        const rankSpan = document.createElement('span');
        rankSpan.textContent = `${index + 1}.`;
        rankSpan.style.color = '#00f7ff';
        rankSpan.style.fontWeight = 'bold';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.name;
        nameSpan.style.color = 'white';
        nameSpan.style.fontFamily = '"Syncopate", sans-serif';

        const scoreSpan = document.createElement('span');
        scoreSpan.textContent = entry.score;
        scoreSpan.style.color = '#ff00f7';
        scoreSpan.style.fontWeight = 'bold';

        scoreRow.appendChild(rankSpan);
        scoreRow.appendChild(nameSpan);
        scoreRow.appendChild(scoreSpan);

        scoresTable.appendChild(scoreRow);
    });

    // Create back button
    const backButton = createMenuButton('BACK TO MENU');
    backButton.addEventListener('click', () => {
        createMainMenu();
        playSound('pickup');
    });

    // Add to scores container
    scoresContainer.appendChild(title);
    scoresContainer.appendChild(scoresTable);
    scoresContainer.appendChild(backButton);

    // Add to game container
    gameContainer.appendChild(scoresContainer);
}

// Show instructions screen
function showInstructions() {
    if (!gameContainer) return;
    
    // Clear container
    gameContainer.innerHTML = '';

    // Create instructions container
    const instructionsContainer = document.createElement('div');
    instructionsContainer.style.position = 'absolute';
    instructionsContainer.style.width = '100%';
    instructionsContainer.style.height = '100%';
    instructionsContainer.style.display = 'flex';
    instructionsContainer.style.flexDirection = 'column';
    instructionsContainer.style.justifyContent = 'center';
    instructionsContainer.style.alignItems = 'center';
    instructionsContainer.style.background = 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(10, 0, 20, 0.9))';
    instructionsContainer.style.zIndex = '100';

    // Create title
    const title = document.createElement('h1');
    title.textContent = 'HOW TO PLAY';
    title.style.color = '#ff00f7';
    title.style.fontFamily = '"Syncopate", sans-serif';
    title.style.fontSize = '36px';
    title.style.marginBottom = '20px';
    title.style.textShadow = '0 0 10px #ff00f7';

    // Create instructions content
    const instructionsContent = document.createElement('div');
    instructionsContent.style.width = '80%';
    instructionsContent.style.maxWidth = '600px';
    instructionsContent.style.marginBottom = '30px';
    instructionsContent.style.background = 'rgba(0, 0, 0, 0.5)';
    instructionsContent.style.padding = '20px';
    instructionsContent.style.borderRadius = '10px';
    instructionsContent.style.border = '1px solid #ff00f7';
    instructionsContent.style.boxShadow = '0 0 20px rgba(255, 0, 247, 0.3)';
    instructionsContent.style.color = 'white';
    instructionsContent.style.lineHeight = '1.6';
    instructionsContent.style.textAlign = 'center';

    // Instructions text
    instructionsContent.innerHTML = `
        <p style="margin-bottom: 15px;">You are Playboi Carti (🧛🏿‍♂️) and your job is to collect hearts (❤️) and money bags (💰) 
        while shooting or avoiding zombie fans (🧟‍♂️) and dropping music CDs (💿).</p>

        <div style="margin: 20px 0; display: flex; justify-content: space-around; text-align: center;">
            <div>
                <p style="font-size: 24px; margin-bottom: 10px;">❤️ 💰</p>
                <p>Collect these<br>+1/+2 points</p>
            </div>
            <div>
                <p style="font-size: 24px; margin-bottom: 10px;">🧟‍♂️ 💿</p>
                <p>Shoot or avoid<br>-2/-3 points if hit</p>
            </div>
        </div>

        <p style="margin-bottom: 15px;"><span style="color: #00f7ff; font-weight: bold;">Controls:</span></p>
        <p>← → Arrow Keys: Move left/right</p>
        <p>Space or ↑ Arrow: Shoot</p>
        <p>P: Pause game</p>
        <p>ESC: Return to menu</p>

        <p style="margin-top: 20px;"><span style="color: #ff00f7; font-weight: bold;">Power-ups:</span></p>
        <p>⚡ - Rapid Fire</p>
        <p>🛡️ - Shield</p>
        <p>🔄 - Triple Shot</p>
        <p>🌟 - Extra Life</p>
    `;

    // Create back button
    const backButton = createMenuButton('BACK TO MENU');
    backButton.addEventListener('click', () => {
        createMainMenu();
        playSound('pickup');
    });

    // Add to instructions container
    instructionsContainer.appendChild(title);
    instructionsContainer.appendChild(instructionsContent);
    instructionsContainer.appendChild(backButton);

    // Add to game container
    gameContainer.appendChild(instructionsContainer);
}

// Start game function
function startGame() {
    if (!gameContainer) return;
    
    // Clear game container
    gameContainer.innerHTML = '';

    // Set game state
    gameState = "playing";
    gameStarted = true;
    score = 0;
    lives = 3;
    gameLevel = 1;
    gameOver = false;
    gamePaused = false;

    // Reset all game arrays
    fallingItems.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    powerups.length = 0;
    explosions.length = 0;

    // Reset powerup states
    invincible = false;
    rapidFire = false;
    bulletType = "normal";

    // Create HUD
    createHUD();

    // Add the player (Carti)
    carti = document.createElement('div');
    carti.innerHTML = '🧛🏿‍♂️'; // Dark emoji for Carti
    carti.style.position = 'absolute';
    carti.style.fontSize = '50px';
    carti.style.left = '50%';
    carti.style.bottom = '20px';
    carti.style.transform = 'translateX(-50%)';
    carti.style.zIndex = '10';
    carti.style.transition = 'filter 0.2s';
    gameContainer.appendChild(carti);

    // Start the animation loop
    lastSpawnTime = Date.now();
    lastEnemyTime = Date.now();
    lastGroupTime = Date.now();
    lastPowerupTime = Date.now();
    animate();

    // Play background music
    if (!soundsMuted) {
        try {
            if (sounds.background) {
                sounds.background.currentTime = 0;
                sounds.background.play().catch(e => console.log("Background music prevented:", e));
            }
        } catch (err) {
            console.log("Background music error:", err);
        }
    }
}

// Create game HUD
function createHUD() {
    if (!gameContainer) return;
    
    // Create score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'game-score';
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.color = '#00f7ff';
    scoreDisplay.style.fontSize = '24px';
    scoreDisplay.style.fontWeight = 'bold';
    scoreDisplay.style.position = 'absolute';
    scoreDisplay.style.top = '10px';
    scoreDisplay.style.left = '10px';
    scoreDisplay.style.textShadow = '0 0 5px #00f7ff';
    gameContainer.appendChild(scoreDisplay);

    // Create level display
    const levelDisplay = document.createElement('div');
    levelDisplay.id = 'game-level';
    levelDisplay.textContent = `Level: ${gameLevel}`;
    levelDisplay.style.color = '#ff00f7';
    levelDisplay.style.fontSize = '24px';
    levelDisplay.style.fontWeight = 'bold';
    levelDisplay.style.position = 'absolute';
    levelDisplay.style.top = '10px';
    levelDisplay.style.right = '10px';
    levelDisplay.style.textShadow = '0 0 5px #ff00f7';
    gameContainer.appendChild(levelDisplay);

    // Create lives display
    const livesContainer = document.createElement('div');
    livesContainer.id = 'game-lives';
    livesContainer.style.position = 'absolute';
    livesContainer.style.bottom = '10px';
    livesContainer.style.left = '10px';
    livesContainer.style.display = 'flex';
    livesContainer.style.gap = '5px';
    updateLives(livesContainer);
    gameContainer.appendChild(livesContainer);

    // Create powerup indicator
    const powerupIndicator = document.createElement('div');
    powerupIndicator.id = 'powerup-indicator';
    powerupIndicator.style.position = 'absolute';
    powerupIndicator.style.bottom = '10px';
    powerupIndicator.style.right = '10px';
    powerupIndicator.style.fontSize = '24px';
    powerupIndicator.style.display = 'flex';
    powerupIndicator.style.gap = '10px';
    gameContainer.appendChild(powerupIndicator);
}

// Update lives display
function updateLives(container) {
    const livesContainer = container || document.getElementById('game-lives');
    if (!livesContainer) return;

    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('span');
        life.innerHTML = '❤️';
        life.style.fontSize = '24px';
        life.style.filter = 'drop-shadow(0 0 3px red)';
        livesContainer.appendChild(life);
    }
}

// Update powerup indicators
function updatePowerupIndicators() {
    const indicator = document.getElementById('powerup-indicator');
    if (!indicator) return;

    indicator.innerHTML = '';

    if (invincible) {
        const shield = document.createElement('span');
        shield.innerHTML = '🛡️';
        shield.style.fontSize = '24px';
        shield.style.filter = 'drop-shadow(0 0 5px blue)';
        indicator.appendChild(shield);
    }

    if (rapidFire) {
        const rapid = document.createElement('span');
        rapid.innerHTML = '⚡';
        rapid.style.fontSize = '24px';
        rapid.style.filter = 'drop-shadow(0 0 5px yellow)';
        indicator.appendChild(rapid);
    }

    if (bulletType === "triple") {
        const triple = document.createElement('span');
        triple.innerHTML = '🔄';
        triple.style.fontSize = '24px';
        triple.style.filter = 'drop-shadow(0 0 5px green)';
        indicator.appendChild(triple);
    }

    if (bulletType === "laser") {
        const laser = document.createElement('span');
        laser.innerHTML = '🌠';
        laser.style.fontSize = '24px';
        laser.style.filter = 'drop-shadow(0 0 5px purple)';
        indicator.appendChild(laser);
    }
}

// Create starfield background
function createStarfield() {
    if (!gameContainer) return;
    
    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.style.position = 'absolute';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.backgroundColor = '#ffffff';
        star.style.borderRadius = '50%';
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.left = Math.random() * gameContainer.offsetWidth + 'px';
        star.style.top = Math.random() * gameContainer.offsetHeight + 'px';
        star.dataset.speed = Math.random() * 0.5 + 0.1;

        gameContainer.appendChild(star);
        starParticles.push(star);
    }
}

// Update starfield animation
function updateStarfield() {
    for (let i = 0; i < starParticles.length; i++) {
        const star = starParticles[i];
        const top = parseFloat(star.style.top) || 0;
        const speed = parseFloat(star.dataset.speed) || 0.1;

        star.style.top = (top + speed) + 'px';

        // Reset stars that go off screen
        if (top > gameContainer.offsetHeight) {
            star.style.top = '0px';
            star.style.left = Math.random() * gameContainer.offsetWidth + 'px';
        }
    }
}

// Create falling hearts and money bags
function spawnItem() {
    if (!gameContainer) return;
    
    const currentTime = Date.now();
    if (currentTime - lastSpawnTime < Math.max(800, 1500 - (gameLevel * 100))) return; // Level-based spawn rate
    lastSpawnTime = currentTime;

    const item = document.createElement('div');
    const type = Math.random() < 0.5 ? 'heart' : 'money';

    item.innerHTML = type === 'heart' ? '❤️' : '💰'; // Heart or Money bag
    item.dataset.type = type;
    item.style.position = 'absolute';
    item.style.fontSize = '30px';
    item.style.left = Math.random() * (gameContainer.offsetWidth - 30) + 'px';
    item.style.top = '0px';

    gameContainer.appendChild(item);
    fallingItems.push(item);
}

// Create enemy (fans or CDs)
function spawnEnemy() {
    if (!gameContainer) return;
    
    const currentTime = Date.now();
    if (currentTime - lastEnemyTime < Math.max(800, 2000 - (gameLevel * 150))) return; // Level-based spawn rate
    lastEnemyTime = currentTime;

    const enemy = document.createElement('div');
    const type = Math.random() < 0.5 ? 'fan' : 'music';

    enemy.innerHTML = type === 'fan' ? '🧟‍♂️' : '💿'; // Fan or Music CD
    enemy.dataset.type = type;
    enemy.style.position = 'absolute';
    enemy.style.fontSize = '30px';
    enemy.style.left = Math.random() * (gameContainer.offsetWidth - 30) + 'px';
    enemy.style.top = '0px';

    // Add movement pattern for higher levels
    if (gameLevel >= 3 && Math.random() < 0.3) {
        enemy.dataset.movementType = 'zigzag';
        enemy.dataset.zigzagPhase = '0';
    }

    gameContainer.appendChild(enemy);
    enemies.push(enemy);
}

// Spawn a powerup
function spawnPowerup() {
    if (!gameContainer) return;
    
    const currentTime = Date.now();
    if (currentTime - lastPowerupTime < 10000) return; // 10 seconds between powerups
    lastPowerupTime = currentTime;

    // 20% chance to not spawn a powerup
    if (Math.random() < 0.2) return;

    const powerupTypes = [
        { icon: '⚡', type: 'rapidFire' },
        { icon: '🛡️', type: 'shield' },
        { icon: '🔄', type: 'tripleShot' },
        { icon: '🌟', type: 'extraLife' }
    ];

    const powerupIndex = Math.floor(Math.random() * powerupTypes.length);
    const powerupInfo = powerupTypes[powerupIndex];

    const powerup = document.createElement('div');
    powerup.innerHTML = powerupInfo.icon;
    powerup.dataset.type = powerupInfo.type;
    powerup.style.position = 'absolute';
    powerup.style.fontSize = '30px';
    powerup.style.left = Math.random() * (gameContainer.offsetWidth - 30) + 'px';
    powerup.style.top = '0px';
    powerup.style.filter = 'drop-shadow(0 0 8px yellow)';
    powerup.style.animation = 'powerupGlow 1s infinite';

    // Add glowing animation
    const glowStyleId = 'powerupGlowStyle';
    if (!document.getElementById(glowStyleId)) {
        const glowStyle = document.createElement('style');
        glowStyle.id = glowStyleId;
        glowStyle.textContent = `
            @keyframes powerupGlow {
                0%, 100% { filter: drop-shadow(0 0 8px yellow); transform: scale(1); }
                50% { filter: drop-shadow(0 0 12px yellow); transform: scale(1.1); }
            }
        `;
        document.head.appendChild(glowStyle);
    }

    gameContainer.appendChild(powerup);
    powerups.push(powerup);
}

// Create a bullet
function shoot() {
    if (!gameContainer || !carti) return;
    if (gamePaused || gameOver) return;

    const currentTime = Date.now();
    const actualCooldown = rapidFire ? shootCooldown / 3 : shootCooldown;
    if (currentTime - lastShootTime < actualCooldown) return; // Control shooting rate
    lastShootTime = currentTime;

    // Play shoot sound
    playSound('shoot');

    // Get Carti's position
    const cartiRect = carti.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const cartiX = cartiRect.left - containerRect.left + cartiRect.width / 2;
    const cartiY = cartiRect.top - containerRect.top;

    if (bulletType === "normal") {
        // Single bullet
        createBullet(cartiX, cartiY);
    } else if (bulletType === "triple") {
        // Triple shot
        createBullet(cartiX, cartiY);
        createBullet(cartiX - 20, cartiY, -2);
        createBullet(cartiX + 20, cartiY, 2);
    } else if (bulletType === "laser") {
        // Laser beam
        createLaserBeam(cartiX, cartiY);
    }
}

// Create a single bullet
function createBullet(x, y, xVelocity = 0) {
    if (!gameContainer) return;
    
    const bullet = document.createElement('div');
    bullet.innerHTML = '🔥'; // Fire emoji for bullet
    bullet.style.position = 'absolute';
    bullet.style.fontSize = '20px';
    bullet.style.left = (x - 10) + 'px';
    bullet.style.top = y + 'px';
    bullet.dataset.xVelocity = xVelocity;

    gameContainer.appendChild(bullet);
    bullets.push(bullet);
}

// Create a laser beam
function createLaserBeam(x, y) {
    if (!gameContainer) return;
    
    const laser = document.createElement('div');
    laser.classList.add('laser-beam');
    laser.style.position = 'absolute';
    laser.style.width = '10px';
    laser.style.height = y + 'px'; // Stretch to the top
    laser.style.backgroundColor = '#ff00f7';
    laser.style.boxShadow = '0 0 10px #ff00f7, 0 0 20px #ff00f7';
    laser.style.borderRadius = '5px';
    laser.style.left = (x - 5) + 'px';
    laser.style.top = '0px';
    laser.style.transform = 'scaleY(0)';
    laser.style.transformOrigin = 'bottom center';
    laser.style.transition = 'transform 0.2s';
    laser.dataset.isLaser = 'true';

    gameContainer.appendChild(laser);
    bullets.push(laser);

    // Animate the laser
    setTimeout(() => {
        laser.style.transform = 'scaleY(1)';
    }, 10);

    // Remove after 200ms
    setTimeout(() => {
        if (gameContainer.contains(laser)) {
            gameContainer.removeChild(laser);
            const index = bullets.indexOf(laser);
            if (index !== -1) {
                bullets.splice(index, 1);
            }
        }
    }, 200);

    // Check for collisions with enemies
    if (enemies.length === 0) return;
    
    const containerRect = gameContainer.getBoundingClientRect();
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyRect = enemy.getBoundingClientRect();
        const enemyX = enemyRect.left - containerRect.left + enemyRect.width / 2;

        // If enemy is in the path of the laser
        if (Math.abs(enemyX - x) < 20) {
            // Add score based on enemy type
            if (enemy.dataset.type === 'fan') {
                score += 2;
            } else { // music CD
                score += 1;
            }

            updateScore();

            // Get enemy position for explosion
            const explosionX = enemyRect.left - containerRect.left + enemyRect.width / 2 - 15;
            const explosionY = enemyRect.top - containerRect.top + enemyRect.height / 2 - 15;

            // Create explosion effect
            createExplosion(explosionX, explosionY, 'enemy');

            // Show score effect
            showScoreEffect(enemy, enemy.dataset.type === 'fan' ? '+2' : '+1', 'green');

            // Play explosion sound
            playSound('explosion');

            // Remove enemy
            gameContainer.removeChild(enemy);
            enemies.splice(i, 1);
        }
    }
}

// Spawn a group of enemies or collectibles
function spawnGroup() {
    if (!gameContainer) return;
    
    const currentTime = Date.now();
    if (currentTime - lastGroupTime < Math.max(5000, 10000 - (gameLevel * 500))) return; // Level-based timing
    lastGroupTime = currentTime;

    const isEnemyGroup = Math.random() < 0.6 + (gameLevel * 0.05); // Higher levels have more enemy groups
    const groupSize = Math.floor(Math.random() * 3) + 3; // 3-5 items in a group
    const groupType = isEnemyGroup ?
                     (Math.random() < 0.5 ? 'fan' : 'music') :
                     (Math.random() < 0.5 ? 'heart' : 'money');

    // Determine formation pattern
    const pattern = Math.floor(Math.random() * 4); // 0: horizontal, 1: vertical, 2: diagonal, 3: V-shape

    // Calculate starting position
    const startX = Math.random() * (gameContainer.offsetWidth - 200) + 100;

    for (let i = 0; i < groupSize; i++) {
        let x, y;

        // Position based on pattern
        switch (pattern) {
            case 0: // Horizontal line
                x = startX + (i * 40);
                y = 0;
                break;
            case 1: // Vertical line
                x = startX;
                y = i * 40;
                break;
            case 2: // Diagonal
                x = startX + (i * 30);
                y = i * 30;
                break;
            case 3: // V-shape
                x = startX + (i - groupSize / 2) * 40;
                y = Math.abs(i - groupSize / 2) * 30;
                break;
            default:
                x = startX + (i * 40);
                y = 0;
        }

        // Create item based on type
        const item = document.createElement('div');

        if (isEnemyGroup) {
            item.innerHTML = groupType === 'fan' ? '🧟‍♂️' : '💿';
            item.dataset.type = groupType;
            item.style.position = 'absolute';
            item.style.fontSize = '30px';
            item.style.left = x + 'px';
            item.style.top = y + 'px';

            // For higher levels, add movement patterns
            if (gameLevel >= 3) {
                // 40% chance for zigzag movement
                if (Math.random() < 0.4) {
                    item.dataset.movementType = 'zigzag';
                    item.dataset.zigzagPhase = (i * 10).toString();
                }
            }

            gameContainer.appendChild(item);
            enemies.push(item);
        } else {
            item.innerHTML = groupType === 'heart' ? '❤️' : '💰';
            item.dataset.type = groupType;
            item.style.position = 'absolute';
            item.style.fontSize = '30px';
            item.style.left = x + 'px';
            item.style.top = y + 'px';

            gameContainer.appendChild(item);
            fallingItems.push(item);
        }
    }
}

// Move falling items down the screen
function moveItems() {
    if (!gameContainer) return;
    
    const speedMultiplier = 1 + (gameLevel * 0.15); // Speed increases with level

    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        const top = parseInt(item.style.top) || 0;
        item.style.top = (top + (1.5 * speedMultiplier)) + 'px';

        // Check for collision with Carti
        if (carti && checkCollision(carti, item)) {
            // Add score based on item type
            if (item.dataset.type === 'heart') {
                score += 1;
            } else { // money
                score += 2;
            }

            updateScore();

            // Show score effect
            showScoreEffect(item, item.dataset.type === 'heart' ? '+1' : '+2');

            // Play pickup sound
            playSound('pickup');

            // Remove item
            gameContainer.removeChild(item);
            fallingItems.splice(i, 1);
        }
        // Remove items that go off screen
        else if (top > gameContainer.offsetHeight) {
            gameContainer.removeChild(item);
            fallingItems.splice(i, 1);
        }
    }
}

// Move enemies down the screen
function moveEnemies() {
    if (!gameContainer || !carti) return;
    
    const speedMultiplier = 1 + (gameLevel * 0.15); // Speed increases with level

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const top = parseInt(enemy.style.top) || 0;
        let left = parseInt(enemy.style.left) || 0;

        // Basic downward movement
        const baseSpeed = 2 * speedMultiplier;

        // Apply movement patterns for more dynamic enemies
        if (enemy.dataset.movementType === 'zigzag') {
            const phase = parseInt(enemy.dataset.zigzagPhase) || 0;
            left += Math.sin(phase / 10) * 3;
            enemy.dataset.zigzagPhase = (phase + 1).toString();
            enemy.style.left = left + 'px';
        }

        enemy.style.top = (top + baseSpeed) + 'px';

        // Check for collision with Carti
        if (checkCollision(carti, enemy)) {
            if (!invincible) {
                // Lose points based on enemy type
                if (enemy.dataset.type === 'fan') {
                    score = Math.max(0, score - 3);
                } else { // music
                    score = Math.max(0, score - 2);
                }

                updateScore();

                // Lose a life
                lives--;
                updateLives();

                // Play damage sound
                playSound('damage');

                // Flash player to indicate damage
                carti.style.filter = 'brightness(300%) hue-rotate(90deg)';
                setTimeout(() => {
                    if (carti) carti.style.filter = '';
                }, 200);

                // Check for game over
                if (lives <= 0) {
                    endGame();
                    return;
                }

                // Temporary invincibility
                invincible = true;
                carti.style.opacity = '0.7';
                setTimeout(() => {
                    invincible = false;
                    if (carti) carti.style.opacity = '1';
                }, 2000);
            }

            // Show lose score effect
            showScoreEffect(enemy, enemy.dataset.type === 'fan' ? '-3' : '-2', 'red');

            // Create explosion effect
            const enemyRect = enemy.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();
            const explosionX = enemyRect.left - containerRect.left + enemyRect.width / 2 - 15;
            const explosionY = enemyRect.top - containerRect.top + enemyRect.height / 2 - 15;
            createExplosion(explosionX, explosionY, 'damage');

            // Remove enemy
            gameContainer.removeChild(enemy);
            enemies.splice(i, 1);
        }
        // Remove enemies that go off screen
        else if (top > gameContainer.offsetHeight) {
            gameContainer.removeChild(enemy);
            enemies.splice(i, 1);
        }
    }
}

// Move powerups down the screen
function movePowerups() {
    if (!gameContainer || !carti) return;
    
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        const top = parseInt(powerup.style.top) || 0;
        powerup.style.top = (top + 2) + 'px';

        // Check for collision with Carti
        if (checkCollision(carti, powerup)) {
            // Apply powerup effect
            applyPowerup(powerup.dataset.type);

            // Play powerup sound
            playSound('powerup');

            // Show powerup activation effect
            showPowerupEffect(powerup);

            // Remove powerup
            gameContainer.removeChild(powerup);
            powerups.splice(i, 1);
        }
        // Remove powerups that go off screen
        else if (top > gameContainer.offsetHeight) {
            gameContainer.removeChild(powerup);
            powerups.splice(i, 1);
        }
    }
}

// Apply a powerup effect
function applyPowerup(type) {
    if (!carti) return;
    
    const duration = 10000; // 10 seconds for most powerups

    switch (type) {
        case 'rapidFire':
            rapidFire = true;
            setTimeout(() => {
                rapidFire = false;
                updatePowerupIndicators();
            }, duration);
            break;

        case 'shield':
            invincible = true;
            carti.style.filter = 'drop-shadow(0 0 10px blue)';
            setTimeout(() => {
                invincible = false;
                if (carti) carti.style.filter = '';
                updatePowerupIndicators();
            }, duration);
            break;

        case 'tripleShot':
            bulletType = "triple";
            setTimeout(() => {
                bulletType = "normal";
                updatePowerupIndicators();
            }, duration);
            break;

        case 'extraLife':
            lives = Math.min(lives + 1, 5); // Max 5 lives
            updateLives();
            break;
    }

    // Update powerup indicators
    updatePowerupIndicators();
}

// Show powerup activation effect
function showPowerupEffect(powerup) {
    if (!gameContainer) return;
    
    const effect = document.createElement('div');
    effect.textContent = 'POWER UP!';
    effect.style.position = 'absolute';
    effect.style.color = '#ffff00';
    effect.style.fontSize = '24px';
    effect.style.fontWeight = 'bold';
    effect.style.left = powerup.style.left;
    effect.style.top = powerup.style.top;
    effect.style.zIndex = '100';
    effect.style.pointerEvents = 'none';
    effect.style.textShadow = '0 0 10px #ffff00';
    gameContainer.appendChild(effect);

    // Animate the effect
    let opacity = 1;
    let posY = parseInt(effect.style.top);

    const effectInterval = setInterval(() => {
        opacity -= 0.05;
        posY -= 3;
        effect.style.opacity = opacity;
        effect.style.top = posY + 'px';

        if (opacity <= 0) {
            clearInterval(effectInterval);
            if (gameContainer.contains(effect)) {
                gameContainer.removeChild(effect);
            }
        }
    }, 50);
}

// Move bullets up the screen and check for collisions
function moveBullets() {
    if (!gameContainer) return;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Skip laser beams which are handled differently
        if (bullet.dataset.isLaser === 'true') continue;

        const top = parseInt(bullet.style.top) || 0;
        let left = parseInt(bullet.style.left) || 0;

        // Apply x velocity if it exists
        const xVelocity = parseFloat(bullet.dataset.xVelocity) || 0;
        left += xVelocity;
        bullet.style.left = left + 'px';

        // Move bullet upward
        bullet.style.top = (top - bulletSpeed) + 'px';

        // Check for collision with enemies
        let hitEnemy = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (checkCollision(bullet, enemy)) {
                // Add score based on enemy type
                if (enemy.dataset.type === 'fan') {
                    score += 2;
                } else { // music CD
                    score += 1;
                }

                updateScore();

                // Get enemy position for explosion
                const enemyRect = enemy.getBoundingClientRect();
                const containerRect = gameContainer.getBoundingClientRect();
                const explosionX = enemyRect.left - containerRect.left + enemyRect.width / 2 - 15;
                const explosionY = enemyRect.top - containerRect.top + enemyRect.height / 2 - 15;

                // Create explosion effect
                createExplosion(explosionX, explosionY, 'enemy');

                // Show score effect
                showScoreEffect(enemy, enemy.dataset.type === 'fan' ? '+2' : '+1', 'green');

                // Play explosion sound
                playSound('explosion');

                // Remove enemy and bullet
                gameContainer.removeChild(enemy);
                enemies.splice(j, 1);
                gameContainer.removeChild(bullet);
                bullets.splice(i, 1);
                hitEnemy = true;
                break;
            }
        }

        // Remove bullets that go off screen or hit an enemy
        if (!hitEnemy) {
            if (top < -20 || left < -20 || left > gameContainer.offsetWidth + 20) {
                gameContainer.removeChild(bullet);
                bullets.splice(i, 1);
            }
        }
    }
}

// Check for collisions between objects
function checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;

    const rect1 = obj1.getBoundingClientRect();
    const rect2 = obj2.getBoundingClientRect();

    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

// Update the score display
function updateScore() {
    const scoreDisplay = document.getElementById('game-score');
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score}`;
    }

    // Check for level up
    if (score >= gameLevel * 50) {
        levelUp();
    }
}

// Level up function
function levelUp() {
    if (!gameContainer) return;
    
    gameLevel++;

    // Update level display
    const levelDisplay = document.getElementById('game-level');
    if (levelDisplay) {
        levelDisplay.textContent = `Level: ${gameLevel}`;
        levelDisplay.style.animation = 'levelUpPulse 1s';
        setTimeout(() => {
            if (levelDisplay) levelDisplay.style.animation = '';
        }, 1000);
    }

    // Add level up animation style
    const levelUpStyleId = 'levelUpPulseStyle';
    if (!document.getElementById(levelUpStyleId)) {
        const levelUpStyle = document.createElement('style');
        levelUpStyle.id = levelUpStyleId;
        levelUpStyle.textContent = `
            @keyframes levelUpPulse {
                0%, 100% { transform: scale(1); text-shadow: 0 0 5px #ff00f7; }
                50% { transform: scale(1.5); text-shadow: 0 0 20px #ff00f7; }
            }
        `;
        document.head.appendChild(levelUpStyle);
    }

    // Show level up message
    const levelUpMsg = document.createElement('div');
    levelUpMsg.textContent = `LEVEL ${gameLevel}`;
    levelUpMsg.style.position = 'absolute';
    levelUpMsg.style.width = '100%';
    levelUpMsg.style.textAlign = 'center';
    levelUpMsg.style.top = '50%';
    levelUpMsg.style.left = '0';
    levelUpMsg.style.color = '#ff00f7';
    levelUpMsg.style.fontSize = '48px';
    levelUpMsg.style.fontWeight = 'bold';
    levelUpMsg.style.textShadow = '0 0 20px #ff00f7';
    levelUpMsg.style.zIndex = '100';
    levelUpMsg.style.animation = 'levelUpMsg 2s forwards';

    // Level up animation
    const levelUpMsgStyleId = 'levelUpMsgStyle';
    if (!document.getElementById(levelUpMsgStyleId)) {
        const levelUpMsgStyle = document.createElement('style');
        levelUpMsgStyle.id = levelUpMsgStyleId;
        levelUpMsgStyle.textContent = `
            @keyframes levelUpMsg {
                0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                20% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                80% { transform: scale(1) rotate(0); opacity: 1; }
                100% { transform: scale(2) rotate(10deg); opacity: 0; }
            }
        `;
        document.head.appendChild(levelUpMsgStyle);
    }

    gameContainer.appendChild(levelUpMsg);

    // Play level up sound
    playSound('levelUp');

    // Remove message after animation
    setTimeout(() => {
        if (gameContainer.contains(levelUpMsg)) {
            gameContainer.removeChild(levelUpMsg);
        }
    }, 2000);

    // Add bonus for level up
    if (gameLevel % 3 === 0) {
        // Every 3 levels, add an extra life
        lives = Math.min(lives + 1, 5);
        updateLives();

        // Show extra life message
        if (carti) {
            showScoreEffect(carti, "+1 LIFE", "#00ff00");
        }
    }
}

// Show score effect
function showScoreEffect(item, text, color = 'white') {
    if (!gameContainer) return;
    
    const effect = document.createElement('div');
    effect.textContent = text;
    effect.style.position = 'absolute';
    effect.style.color = color;
    effect.style.fontSize = '24px';
    effect.style.fontWeight = 'bold';
    effect.style.left = item.style.left;
    effect.style.top = item.style.top;
    effect.style.zIndex = '100';
    effect.style.pointerEvents = 'none';
    effect.style.textShadow = '0 0 5px black';
    gameContainer.appendChild(effect);

    // Animate the effect
    let opacity = 1;
    let posY = parseInt(effect.style.top);

    const effectInterval = setInterval(() => {
        opacity -= 0.05;
        posY -= 2;
        effect.style.opacity = opacity;
        effect.style.top = posY + 'px';

        if (opacity <= 0) {
            clearInterval(effectInterval);
            if (gameContainer.contains(effect)) {
                gameContainer.removeChild(effect);
            }
        }
    }, 50);
}

// Create explosion effect
function createExplosion(x, y, type) {
    if (!gameContainer) return;
    
    const particleCount = 12;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.fontSize = '15px';
        particle.innerHTML = type === 'enemy' ? '💥' : (type === 'damage' ? '💔' : '✨');
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.zIndex = '100';

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particle.dataset.vx = Math.cos(angle) * speed;
        particle.dataset.vy = Math.sin(angle) * speed;
        particle.dataset.life = 30; // Particle lifetime in frames

        gameContainer.appendChild(particle);
        particles.push(particle);
    }

    explosions.push({
        particles,
        age: 0,
        maxAge: 30
    });
}

// Update explosions
function updateExplosions() {
    if (!gameContainer) return;
    
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];

        for (let j = 0; j < explosion.particles.length; j++) {
            const particle = explosion.particles[j];
            const x = parseFloat(particle.style.left) || 0;
            const y = parseFloat(particle.style.top) || 0;
            const vx = parseFloat(particle.dataset.vx) || 0;
            const vy = parseFloat(particle.dataset.vy) || 0;
            const life = parseFloat(particle.dataset.life) || 0;

            particle.style.left = (x + vx) + 'px';
            particle.style.top = (y + vy) + 'px';
            particle.dataset.life = life - 1;

            // Fade out
            particle.style.opacity = life / 30;

            // Scale down
            const scale = life / 30 * 0.5 + 0.5;
            particle.style.transform = `scale(${scale})`;
        }

        explosion.age++;

        // Remove explosion when all particles are dead
        if (explosion.age >= explosion.maxAge) {
            for (let j = 0; j < explosion.particles.length; j++) {
                if (gameContainer.contains(explosion.particles[j])) {
                    gameContainer.removeChild(explosion.particles[j]);
                }
            }
            explosions.splice(i, 1);
        }
    }
}

// Handle keyboard controls for Carti
document.addEventListener('keydown', (event) => {
    // Prevent default scrolling with arrow keys and space
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }

    // Menu state controls
    if (gameState === "menu") {
        // Start game with Enter or Space
        if (event.code === 'Enter' || event.code === 'Space') {
            startGame();
            playSound('pickup');
        }
        return;
    }

    // Pause state controls
    if (gameState === "paused") {
        if (event.code === 'KeyP' || event.code === 'Escape') {
            resumeGame();
        }
        return;
    }

    // Game over state controls
    if (gameState === "gameOver") {
        if (event.code === 'Enter' || event.code === 'Space') {
            createMainMenu();
        }
        return;
    }

    // Playing state controls
    if (gameState === "playing") {
        if (event.code === 'ArrowLeft') {
            moveLeft = true;
        } else if (event.code === 'ArrowRight') {
            moveRight = true;
        } else if (event.code === 'Space' || event.code === 'ArrowUp') {
            // Space or up arrow to shoot
            shoot();
        } else if (event.code === 'KeyP') {
            // P to pause
            pauseGame();
        } else if (event.code === 'Escape') {
            // Escape to return to menu
            confirmQuit();
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft') {
        moveLeft = false;
    } else if (event.code === 'ArrowRight') {
        moveRight = false;
    }
});

// Update Carti's position based on movement flags
function moveCarti() {
    if (!carti || !gameContainer || gamePaused || gameOver) return;

    const cartiRect = carti.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const currentLeft = cartiRect.left - containerRect.left;
    const moveSpeed = 5; // Smoother, continuous movement

    if (moveLeft) {
        const newLeft = Math.max(0, currentLeft - moveSpeed);
        carti.style.left = newLeft + 'px';
        carti.style.transform = 'translateX(0)';
    }

    if (moveRight) {
        const newLeft = Math.min(containerRect.width - cartiRect.width, currentLeft + moveSpeed);
        carti.style.left = newLeft + 'px';
        carti.style.transform = 'translateX(0)';
    }
}

// Pause the game
function pauseGame() {
    if (gameState !== "playing") return;

    gameState = "paused";
    gamePaused = true;

    // Create pause screen
    const pauseScreen = document.createElement('div');
    pauseScreen.id = 'pause-screen';
    pauseScreen.style.position = 'absolute';
    pauseScreen.style.width = '100%';
    pauseScreen.style.height = '100%';
    pauseScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    pauseScreen.style.display = 'flex';
    pauseScreen.style.flexDirection = 'column';
    pauseScreen.style.justifyContent = 'center';
    pauseScreen.style.alignItems = 'center';
    pauseScreen.style.zIndex = '1000';
    pauseScreen.innerHTML = `
        <h2 style="color: #ff00f7; font-size: 32px; margin-bottom: 20px;">GAME PAUSED</h2>
        <p style="color: white; margin-bottom: 20px;">Press P to resume or ESC to quit</p>
    `;

    gameContainer.appendChild(pauseScreen);

    // Pause background music
    if (sounds.background) {
        sounds.background.pause();
    }
}

// Resume the game
function resumeGame() {
    if (gameState !== "paused") return;

    gameState = "playing";
    gamePaused = false;

    // Remove pause screen
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen && gameContainer.contains(pauseScreen)) {
        gameContainer.removeChild(pauseScreen);
    }

    // Resume background music
    if (!soundsMuted && sounds.background) {
        sounds.background.play().catch(e => console.log("Background music play prevented:", e));
    }
}

// Confirm quit game
function confirmQuit() {
    if (gameState !== "playing") return;

    gameState = "paused";
    gamePaused = true;

    // Create confirm screen
    const confirmScreen = document.createElement('div');
    confirmScreen.id = 'confirm-screen';
    confirmScreen.style.position = 'absolute';
    confirmScreen.style.width = '100%';
    confirmScreen.style.height = '100%';
    confirmScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    confirmScreen.style.display = 'flex';
    confirmScreen.style.flexDirection = 'column';
    confirmScreen.style.justifyContent = 'center';
    confirmScreen.style.alignItems = 'center';
    confirmScreen.style.zIndex = '1000';

    confirmScreen.innerHTML = `
        <h2 style="color: #ff00f7; font-size: 28px; margin-bottom: 20px;">QUIT GAME?</h2>
        <p style="color: white; margin-bottom: 20px;">All progress will be lost!</p>
        <div style="display: flex; gap: 20px; margin-top: 20px;">
            <button id="quit-yes" style="background: #ff0000; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px;">Yes</button>
            <button id="quit-no" style="background: #00f7ff; color: black; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px;">No</button>
        </div>
    `;

    gameContainer.appendChild(confirmScreen);

    // Add button event listeners
    document.getElementById('quit-yes').addEventListener('click', () => {
        createMainMenu();
        playSound('pickup');
    });

    document.getElementById('quit-no').addEventListener('click', () => {
        gameState = "playing";
        gamePaused = false;
        gameContainer.removeChild(confirmScreen);
        playSound('pickup');
    });

    // Pause background music
    if (sounds.background) {
        sounds.background.pause();
    }
}

// End the game
function endGame() {
    gameOver = true;
    gameState = "gameOver";

    // Stop the game loop
    if (gameAnimation) {
        cancelAnimationFrame(gameAnimation);
        gameAnimation = null;
    }

    // Play game over sound
    playSound('gameOver');

    // Stop background music
    if (sounds.background) {
        sounds.background.pause();
    }

    // Show game over screen
    showGameOverScreen();
}

// Show game over screen
function showGameOverScreen() {
    if (!gameContainer) return;
    
    // Create game over container
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.justifyContent = 'center';
    gameOverScreen.style.alignItems = 'center';
    gameOverScreen.style.background = 'linear-gradient(rgba(0, 0, 0, 0.8), rgba(20, 0, 20, 0.9))';
    gameOverScreen.style.zIndex = '100';

    // Create game over text
    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'GAME OVER';
    gameOverText.style.color = '#ff0000';
    gameOverText.style.fontFamily = '"Syncopate", sans-serif';
    gameOverText.style.fontSize = '48px';
    gameOverText.style.marginBottom = '20px';
    gameOverText.style.textShadow = '0 0 20px #ff0000';
    gameOverText.style.animation = 'gameOverPulse 2s infinite';

    // Add game over animation
    const gameOverStyleId = 'gameOverPulseStyle';
    if (!document.getElementById(gameOverStyleId)) {
        const gameOverStyle = document.createElement('style');
        gameOverStyle.id = gameOverStyleId;
        gameOverStyle.textContent = `
            @keyframes gameOverPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); text-shadow: 0 0 30px #ff0000; }
            }
        `;
        document.head.appendChild(gameOverStyle);
    }

    // Create score text
    const scoreText = document.createElement('h2');
    scoreText.textContent = `Final Score: ${score}`;
    scoreText.style.color = '#ffffff';
    scoreText.style.fontSize = '36px';
    scoreText.style.marginBottom = '30px';

    // Create level text
    const levelText = document.createElement('h3');
    levelText.textContent = `Level Reached: ${gameLevel}`;
    levelText.style.color = '#ff00f7';
    levelText.style.fontSize = '24px';
    levelText.style.marginBottom = '40px';

    // Check if score is a high score
    let highScoreForm = null;
    if (isHighScore(score)) {
        highScoreForm = document.createElement('div');
        highScoreForm.style.marginBottom = '30px';
        highScoreForm.style.display = 'flex';
        highScoreForm.style.flexDirection = 'column';
        highScoreForm.style.alignItems = 'center';

        const highScoreText = document.createElement('h3');
        highScoreText.textContent = 'NEW HIGH SCORE!';
        highScoreText.style.color = '#ffff00';
        highScoreText.style.fontSize = '28px';
        highScoreText.style.marginBottom = '15px';
        highScoreText.style.textShadow = '0 0 10px #ffff00';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter your name';
        nameInput.maxLength = '10';
        nameInput.style.padding = '10px';
        nameInput.style.fontSize = '18px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.width = '200px';
        nameInput.style.textAlign = 'center';
        nameInput.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        nameInput.style.color = 'white';
        nameInput.style.border = '2px solid #ff00f7';
        nameInput.style.borderRadius = '5px';

        const submitButton = document.createElement('button');
        submitButton.textContent = 'SUBMIT';
        submitButton.style.padding = '10px 20px';
        submitButton.style.fontSize = '18px';
        submitButton.style.backgroundColor = '#ff00f7';
        submitButton.style.color = 'white';
        submitButton.style.border = 'none';
        submitButton.style.borderRadius = '5px';
        submitButton.style.cursor = 'pointer';

        submitButton.addEventListener('click', () => {
            let name = nameInput.value.trim();
            if (name === '') name = 'VAMP KID';
            addHighScore(name, score);
            highScoreForm.innerHTML = '<h3 style="color: #00ff00; font-size: 24px;">Score Saved!</h3>';
            setTimeout(() => {
                highScoreForm.style.display = 'none';
            }, 1500);
        });

        highScoreForm.appendChild(highScoreText);
        highScoreForm.appendChild(nameInput);
        highScoreForm.appendChild(submitButton);
    }

    // Create play again button
    const playAgainButton = createMenuButton('PLAY AGAIN');
    playAgainButton.style.marginBottom = '15px';
    playAgainButton.addEventListener('click', () => {
        startGame();
        playSound('pickup');
    });

    // Create menu button
    const menuButton = createMenuButton('MAIN MENU');
    menuButton.addEventListener('click', () => {
        createMainMenu();
        playSound('pickup');
    });

    // Add all elements to game over screen
    gameOverScreen.appendChild(gameOverText);
    gameOverScreen.appendChild(scoreText);
    gameOverScreen.appendChild(levelText);
    if (highScoreForm) gameOverScreen.appendChild(highScoreForm);
    gameOverScreen.appendChild(playAgainButton);
    gameOverScreen.appendChild(menuButton);

    // Add to game container
    gameContainer.appendChild(gameOverScreen);
}

// Animation loop
function animate() {
    if (!gameStarted || gamePaused || gameOver) {
        if (gameState === "playing") {
            gameAnimation = requestAnimationFrame(animate);
        }
        return;
    }

    spawnItem();
    spawnEnemy();
    spawnGroup();
    spawnPowerup();
    moveItems();
    moveEnemies();
    moveBullets();
    movePowerups();
    moveCarti();
    updateStarfield();
    updateExplosions();
    updatePowerupIndicators();

    gameAnimation = requestAnimationFrame(animate);
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', initCatchCarti);

