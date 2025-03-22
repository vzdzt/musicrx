// Log to confirm the script is loaded
console.log("shop.js loaded");

// Function to create and show the wallet selection modal
function showWalletModal() {
    console.log("showWalletModal called");
    // Check if modal already exists to avoid duplicates
    if (document.getElementById("walletModal")) {
        console.log("Wallet modal already exists, skipping creation");
        return;
    }

    // Create modal overlay
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "wallet-modal-overlay";
    modalOverlay.id = "walletModal";

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.className = "wallet-modal-content";

    // Modal header
    const modalHeader = document.createElement("div");
    modalHeader.className = "wallet-modal-header";
    modalHeader.innerHTML = `
        <h2>Select a Wallet</h2>
        <p>Please select a wallet to connect to MusicRX</p>
        <button class="wallet-modal-close"><i class="fas fa-times"></i></button>
    `;

    // Modal body with wallet options
    const modalBody = document.createElement("div");
    modalBody.className = "wallet-modal-body";
    modalBody.innerHTML = `
        <button class="wallet-option" data-wallet="eth">
            <i class="fab fa-ethereum"></i> MetaMask (ETH)
        </button>
        <button class="wallet-option" data-wallet="sol">
            <i class="fas fa-sun"></i> Phantom (SOL)
        </button>
    `;

    // Append elements
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    console.log("Wallet modal appended to body:", modalOverlay);

    // Event listeners for wallet options
    const walletOptions = modalBody.querySelectorAll(".wallet-option");
    walletOptions.forEach(option => {
        option.addEventListener("click", async () => {
            const walletType = option.getAttribute("data-wallet");
            console.log(`Wallet option clicked: ${walletType}`);
            await connectWallet(walletType);
            closeWalletModal();
        });
    });

    // Event listener for close button
    const closeButton = modalHeader.querySelector(".wallet-modal-close");
    closeButton.addEventListener("click", closeWalletModal);

    // Close modal when clicking outside
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeWalletModal();
    });
}

// Function to close the wallet modal
function closeWalletModal() {
    const modal = document.getElementById("walletModal");
    if (modal) {
        console.log("Closing wallet modal");
        modal.remove();
    }
}

// Function to attach the event listener to the Connect Wallet buttons
function attachWalletButtonListeners() {
    // Navbar button (both pages)
    const connectWalletButton = document.getElementById("connectWallet");
    if (connectWalletButton) {
        console.log("Connect Wallet (navbar) button found, attaching event listener");
        connectWalletButton.addEventListener("click", () => {
            console.log("Connect Wallet (navbar) button clicked");
            showWalletModal();
        });
    } else {
        console.error("Connect Wallet (navbar) button not found in the DOM, retrying...");
        setTimeout(attachWalletButtonListeners, 500); // Use function reference
    }

    // Shop page hero banner button
    const connectWalletShopButton = document.getElementById("connectWalletShop");
    if (connectWalletShopButton) {
        console.log("Connect Wallet (shop page) button found, attaching event listener");
        connectWalletShopButton.addEventListener("click", () => {
            console.log("Connect Wallet (shop page) button clicked");
            showWalletModal();
        });
    }
}

// Use a MutationObserver to watch for the buttons being added to the DOM
const observer = new MutationObserver((mutations, obs) => {
    const connectWalletButton = document.getElementById("connectWallet");
    const connectWalletShopButton = document.getElementById("connectWalletShop");
    if (connectWalletButton || connectWalletShopButton) {
        attachWalletButtonListeners();
        obs.disconnect();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Attach the listeners immediately and on DOMContentLoaded
attachWalletButtonListeners();
document.addEventListener("DOMContentLoaded", attachWalletButtonListeners);

// Web3 wallet connection logic
const ethProvider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
const solConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
const myEthAddress = "0x24A77F76fe0CF427f26A9E49F33f7E9287217250"; // Your MetaMask address (ETH)
const mySolAddress = "7YCdysgzcxuJTrGe5XfyKpobagonNmwT8ygPvpEBwUUr"; // Your Phantom address (SOL)
window.connectedChain = null;
window.connectedAddress = null;
let walletConnectProvider = null;

// Debugging: Check if libraries are loaded
if (typeof ethers === 'undefined') {
    console.error("Ethers.js not loaded. Please ensure the library is included.");
}
if (typeof solanaWeb3 === 'undefined') {
    console.error("Solana Web3.js not loaded. Please ensure the library is included.");
}

async function connectWallet(walletType) {
    const hasEth = window.ethereum;
    const hasSol = window.solana && window.solana.isPhantom;
    const connectWalletButton = document.getElementById("connectWallet");
    const walletStatus = document.getElementById("walletStatus");

    if (!hasEth && !hasSol) {
        alert("Please install MetaMask or Phantom wallet!");
        return;
    }

    if (walletType === "eth" && hasEth) {
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            const signer = ethProvider.getSigner();
            const address = await signer.getAddress();
            window.connectedAddress = address;
            window.connectedChain = "eth";
            if (walletStatus) {
                walletStatus.textContent = `ETH: ${address.slice(0, 6)}...`;
            }
            if (connectWalletButton) {
                connectWalletButton.textContent = "Wallet Connected";
            }
        } catch (error) {
            console.error("ETH connection failed:", error);
            alert("ETH connection failed: " + error.message);
        }
    } else if (walletType === "sol" && hasSol) {
        try {
            await window.solana.connect();
            const address = window.solana.publicKey.toString();
            window.connectedAddress = address;
            window.connectedChain = "sol";
            if (walletStatus) {
                walletStatus.textContent = `SOL: ${address.slice(0, 6)}...`;
            }
            if (connectWalletButton) {
                connectWalletButton.textContent = "Wallet Connected";
            }
        } catch (error) {
            console.error("SOL connection failed:", error);
            alert("SOL connection failed: " + error.message);
        }
    } else {
        alert(`Selected wallet (${walletType.toUpperCase()}) is not available. Please install ${walletType === "eth" ? "MetaMask" : "Phantom"}.`);
    }
}

async function sendEth(amount) {
    if (window.connectedChain !== "eth") return alert("Connect an ETH wallet first!");
    try {
        const provider = walletConnectProvider ? new ethers.providers.Web3Provider(walletConnectProvider) : ethProvider;
        const signer = provider.getSigner();
        const tx = await signer.sendTransaction({
            to: myEthAddress,
            value: ethers.utils.parseEther(amount),
        });
        await tx.wait();
        alert(`Thanks for donating ${amount} ETH!`);
        createTipEffect();
    } catch (error) {
        alert(`ETH transaction failed: ${error.message}`);
    }
}

async function sendSol(amount) {
    if (window.connectedChain !== "sol") return alert("Connect a SOL wallet first!");
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
        alert(`Thanks for donating ${amount} SOL!`);
        createTipEffect();
    } catch (error) {
        alert(`SOL transaction failed: ${error.message}`);
    }
}

// Event Listeners for Web3 Buttons (other than connectWallet)
document.addEventListener("DOMContentLoaded", () => {
    // Tip Machine Logic (Prompt to send a tip via connected wallet)
    const tipButton = document.getElementById('tipMachine');
    const sendTipButton = document.getElementById('sendTip');
    const tipOutput = document.getElementById('tipOutput');

    if (tipButton && sendTipButton && tipOutput) {
        tipButton.addEventListener('click', () => {
            if (!window.connectedAddress) {
                tipOutput.textContent = "Please connect your wallet first!";
            } else {
                tipOutput.textContent = `Connected: ${window.connectedAddress.slice(0, 6)}...`;
            }
        });

        sendTipButton.addEventListener('click', () => {
            const amount = document.getElementById('tipAmount')?.value;
            if (!amount || amount <= 0) {
                tipOutput.textContent = "Please enter a valid amount!";
                return;
            }
            if (!window.connectedAddress) {
                tipOutput.textContent = "Please connect your wallet first!";
                return;
            }
            if (window.connectedChain === "eth") {
                sendEth(amount);
                tipOutput.textContent = `Sending ${amount} ETH...`;
            } else if (window.connectedChain === "sol") {
                sendSol(amount);
                tipOutput.textContent = `Sending ${amount} SOL...`;
            } else {
                tipOutput.textContent = "Unsupported wallet type!";
            }
        });
    }

    document.getElementById("tipEth")?.addEventListener("click", () => {
        const amount = document.getElementById('ethAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        sendEth(amount);
    });

    document.getElementById("tipSol")?.addEventListener("click", () => {
        const amount = document.getElementById('solAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        sendSol(amount);
    });

    document.getElementById("tipBtc")?.addEventListener("click", () => {
        const amount = document.getElementById('btcAmount')?.value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        alert("BTC tipping is not yet Web3-integrated. Coming soon!");
        createTipEffect();
    });

    // Countdown timer for shop page
    function startCountdown() {
        const launchDate = new Date("April 1, 2025 00:00:00").getTime();
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = launchDate - now;
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const daysElement = document.getElementById("days");
            const hoursElement = document.getElementById("hours");
            const minutesElement = document.getElementById("minutes");
            const secondsElement = document.getElementById("seconds");

            if (daysElement) daysElement.textContent = days.toString().padStart(2, '0');
            if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
            if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
            if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');

            if (distance < 0) {
                clearInterval(timer);
                const countdownTimer = document.getElementById("countdown-timer");
                if (countdownTimer) countdownTimer.innerHTML = "<h3>Shop Now Open!</h3>";
            }
        }, 1000);
    }

    startCountdown();
});

// Function to copy wallet addresses to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert("Address copied to clipboard!"))
        .catch(err => {
            console.error('Failed to copy: ', err);
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            alert("Address copied to clipboard!");
        });
}

// Visual effect for tipping
function createTipEffect() {
    for (let i = 0; i < 10; i++) {
        const coin = document.createElement('div');
        coin.style.position = 'fixed';
        coin.style.width = '15px';
        coin.style.height = '15px';
        coin.style.background = 'gold';
        coin.style.borderRadius = '50%';
        coin.style.top = '50%';
        coin.style.left = Math.random() * window.innerWidth + 'px';
        coin.style.zIndex = '9999';

        document.body.appendChild(coin);

        const duration = Math.random() * 2 + 1;
        const delay = Math.random() * 0.5;

        coin.animate([
            { transform: 'translateY(0)', opacity: 1 },
            { transform: `translateY(${window.innerHeight}px)`, opacity: 0 }
        ], {
            duration: duration * 1000,
            delay: delay * 1000,
            easing: 'ease-in',
            fill: 'forwards'
        }).onfinish = () => {
            document.body.removeChild(coin);
        };
    }

    const jar = document.querySelector('.jar');
    if (jar) {
        jar.animate([
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(10deg)' },
            { transform: 'rotate(0deg)' }
        ], {
            duration: 500,
            iterations: 3,
            easing: 'ease-in-out'
        });
    }
}

