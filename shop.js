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

// Function to attach the event listener to the Connect Wallet button
function attachWalletButtonListener() {
    const connectWalletButton = document.getElementById("connectWallet");
    if (connectWalletButton) {
        console.log("Connect Wallet button found, attaching event listener");
        connectWalletButton.addEventListener("click", () => {
            console.log("Connect Wallet button clicked");
            showWalletModal();
        });
    } else {
        console.error("Connect Wallet button not found in the DOM");
        // Retry after a delay
        setTimeout(attachWalletButtonListener, 1000);
    }
}

// Attach the event listener on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired in shop.js");
    attachWalletButtonListener();
});

// Attach the event listener immediately (in case DOMContentLoaded already fired)
attachWalletButtonListener();

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
});

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
