console.log("shop.js loaded");

// Ensure Solana Wallet Adapter namespaces are available
const { Connection, PublicKey, Transaction, SystemProgram } = solanaWeb3;
const { WalletNotConnectedError, Adapter } = solanaWalletAdapterBase;
const { PhantomWalletAdapter } = solanaWalletAdapterWallets;

// Initialize Solana Wallet Adapter
const network = "https://api.mainnet-beta.solana.com";
const connection = new Connection(network, 'confirmed');
const phantomWallet = new PhantomWalletAdapter();

// Ensure modal and overlay elements exist in the DOM once loaded
document.addEventListener("DOMContentLoaded", () => {
    // Create wallet modal if it doesn’t exist
    if (!document.getElementById("walletModal")) {
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "wallet-modal-overlay";
        modalOverlay.id = "walletModal";
        modalOverlay.innerHTML = `
            <div class="wallet-modal-content">
                <div class="wallet-modal-header">
                    <h2>Select a Wallet</h2>
                    <p>Please select a wallet to connect to MusicRX</p>
                    <button class="wallet-modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="wallet-modal-body">
                    <button class="wallet-option" data-wallet="eth">
                        <i class="fab fa-ethereum"></i> MetaMask (ETH)
                    </button>
                    <button class="wallet-option" data-wallet="sol">
                        <i class="fas fa-sun"></i> Phantom (SOL)
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);
        console.log("Wallet modal created and appended to body");
    }

    // Create tip overlay if it doesn’t exist
    if (!document.getElementById("tipOverlay")) {
        const tipOverlay = document.createElement("div");
        tipOverlay.className = "tip-overlay";
        tipOverlay.id = "tipOverlay";
        tipOverlay.innerHTML = `
            <div class="tip-modal">
                <p id="tipStatus">Click to connect your wallet and send a tip!</p>
                <input type="number" placeholder="Amount" id="tipAmount" min="0.001" step="0.001" value="0.01">
                <button id="sendTip"><i class="fas fa-donate"></i> Send Tip</button>
                <button class="close-btn" id="closeTipOverlay">Close</button>
            </div>
        `;
        document.body.appendChild(tipOverlay);
        console.log("Tip overlay created and appended to body");
    }

    // Attach listeners after DOM elements are ensured
    attachWalletButtonListeners();
    attachTipMachineListener();
});

// Function to show the wallet selection modal
function showWalletModal() {
    console.log("showWalletModal called");
    const modalOverlay = document.getElementById("walletModal");
    if (modalOverlay) {
        modalOverlay.classList.add("active");
        console.log("Wallet modal shown with .active class");

        // Event listeners for wallet options (only attach once)
        const walletOptions = modalOverlay.querySelectorAll(".wallet-option");
        walletOptions.forEach(option => {
            option.removeEventListener("click", handleWalletOptionClick);
            option.addEventListener("click", handleWalletOptionClick);
        });

        // Event listener for close button
        const closeButton = modalOverlay.querySelector(".wallet-modal-close");
        closeButton.removeEventListener("click", closeWalletModal);
        closeButton.addEventListener("click", closeWalletModal);

        // Close modal when clicking outside
        modalOverlay.removeEventListener("click", handleOverlayClick);
        modalOverlay.addEventListener("click", handleOverlayClick);
    } else {
        console.error("Wallet modal not found in DOM");
    }
}

// Handle wallet option click
async function handleWalletOptionClick(event) {
    console.log("Wallet option clicked:", event);
    const walletType = event.currentTarget.getAttribute("data-wallet");
    console.log(`Wallet type selected: ${walletType}`);
    await connectWallet(walletType);
    closeWalletModal();
}

// Handle overlay click to close
function handleOverlayClick(e) {
    if (e.target.classList.contains("wallet-modal-overlay")) {
        closeWalletModal();
    }
}

// Function to close the wallet modal
function closeWalletModal() {
    const modal = document.getElementById("walletModal");
    if (modal) {
        modal.classList.remove("active");
        console.log("Wallet modal closed");
    }
}

// Function to attach the event listener to the Connect Wallet buttons
function attachWalletButtonListeners() {
    const connectWalletButton = document.getElementById("connectWallet");
    if (connectWalletButton) {
        console.log("Connect Wallet (navbar) button found, attaching event listener");
        connectWalletButton.removeEventListener("click", handleWalletButtonClick);
        connectWalletButton.addEventListener("click", handleWalletButtonClick);
    }

    const connectWalletShopButton = document.getElementById("connectWalletShop");
    if (connectWalletShopButton) {
        console.log("Connect Wallet (shop page) button found, attaching event listener");
        connectWalletShopButton.removeEventListener("click", handleWalletButtonClick);
        connectWalletShopButton.addEventListener("click", handleWalletButtonClick);
    }
}

// Handle the click event for wallet buttons
function handleWalletButtonClick(event) {
    console.log("Wallet button clicked:", event);
    showWalletModal();
}

// Web3 wallet connection logic
const ethProvider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
const myEthAddress = "0x24A77F76fe0CF427f26A9E49F33f7E9287217250"; // Your MetaMask address (ETH)
// Replace this with a different Solana address you control (not the same as the sender's wallet)
const mySolAddress = "YOUR_NEW_SOLANA_ADDRESS_HERE"; // Replace with a real address
window.connectedChain = null;
window.connectedAddress = null;

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
            console.log("Attempting to connect MetaMask...");
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const signer = ethProvider.getSigner();
            const address = await signer.getAddress();
            window.connectedAddress = address;
            window.connectedChain = "eth";
            if (walletStatus) walletStatus.textContent = `ETH: ${address.slice(0, 6)}...`;
            if (connectWalletButton) connectWalletButton.textContent = "Wallet Connected";
            console.log("MetaMask connected:", address);
        } catch (error) {
            console.error("ETH connection failed:", error);
            alert("ETH connection failed: " + error.message);
        }
    } else if (walletType === "sol" && hasSol) {
        try {
            console.log("Attempting to connect Phantom...");
            await phantomWallet.connect();
            const address = phantomWallet.publicKey.toString();
            window.connectedAddress = address;
            window.connectedChain = "sol";
            if (walletStatus) walletStatus.textContent = `SOL: ${address.slice(0, 6)}...`;
            if (connectWalletButton) connectWalletButton.textContent = "Wallet Connected";
            console.log("Phantom connected:", address);
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
        const signer = ethProvider.getSigner();
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
    if (!phantomWallet.connected) throw new WalletNotConnectedError();

    const tipOutput = document.getElementById("tipStatus");
    try {
        if (tipOutput) tipOutput.textContent = `Sending ${amount} SOL...`;

        const fromPubkey = new PublicKey(window.connectedAddress);
        const toPubkey = new PublicKey(mySolAddress);

        // Create the transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: Number(amount) * solanaWeb3.LAMPORTS_PER_SOL,
            })
        );

        // Fetch recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Sign and send the transaction using Wallet Adapter
        const { signature } = await phantomWallet.signAndSendTransaction(transaction, connection);

        // Confirm the transaction
        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (tipOutput) tipOutput.textContent = `Thanks for donating ${amount} SOL!`;
        alert(`Thanks for donating ${amount} SOL!`);
        createTipEffect();
    } catch (error) {
        console.error("SOL transaction failed:", error);
        if (tipOutput) tipOutput.textContent = `SOL transaction failed: ${error.message}`;
        alert(`SOL transaction failed: ${error.message}`);
    }
}

// Function to attach the event listener to the Tip Machine button
function attachTipMachineListener() {
    const tipButton = document.getElementById("tipMachine");
    const tipOverlay = document.getElementById("tipOverlay");
    const tipOutput = document.getElementById("tipStatus");
    const sendTipButton = document.getElementById("sendTip");
    const closeTipButton = document.getElementById("closeTipOverlay");

    if (tipButton && tipOverlay && tipOutput && sendTipButton && closeTipButton) {
        console.log("Tip Machine elements found, attaching listeners");

        tipButton.addEventListener("click", () => {
            console.log("Tip Machine button clicked");
            tipOverlay.classList.add("active");
            if (!window.connectedAddress) {
                tipOutput.textContent = "Please connect your wallet first!";
            } else {
                tipOutput.textContent = `Connected: ${window.connectedAddress.slice(0, 6)}...`;
            }
        });

        sendTipButton.addEventListener("click", () => {
            console.log("Send Tip button clicked");
            const amount = document.getElementById("tipAmount")?.value;
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
            } else {
                tipOutput.textContent = "Unsupported wallet type!";
            }
        });

        closeTipButton.addEventListener("click", () => {
            console.log("Close Tip Overlay button clicked");
            tipOverlay.classList.remove("active");
        });

        // Close tip overlay when clicking outside
        tipOverlay.addEventListener("click", (e) => {
            if (e.target === tipOverlay) {
                tipOverlay.classList.remove("active");
                console.log("Tip overlay closed via outside click");
            }
        });
    } else {
        console.error("Tip Machine elements not found");
    }
}

// Event Listeners for Web3 Buttons (other than connectWallet and tipMachine)
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tipEth")?.addEventListener("click", () => {
        const amount = document.getElementById("ethAmount")?.value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        sendEth(amount);
    });

    document.getElementById("tipSol")?.addEventListener("click", () => {
        const amount = document.getElementById("solAmount")?.value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        sendSol(amount);
    });

    document.getElementById("tipBtc")?.addEventListener("click", () => {
        const amount = document.getElementById("btcAmount")?.value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        alert("BTC tipping is not yet Web3-integrated. Coming soon!");
        createTipEffect();
    });

    // Countdown timer for shop page
    function startCountdown() {
        const launchDate = new Date("September 22, 2025 00:00:00").getTime();
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

            if (daysElement) daysElement.textContent = days.toString().padStart(2, "0");
            if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, "0");
            if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, "0");
            if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, "0");

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
    navigator.clipboard
        .writeText(text)
        .then(() => alert("Address copied to clipboard!"))
        .catch((err) => {
            console.error("Failed to copy: ", err);
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
        const coin = document.createElement("div");
        coin.style.position = "fixed";
        coin.style.width = "15px";
        coin.style.height = "15px";
        coin.style.background = "gold";
        coin.style.borderRadius = "50%";
        coin.style.top = "50%";
        coin.style.left = Math.random() * window.innerWidth + "px";
        coin.style.zIndex = "9999";

        document.body.appendChild(coin);

        const duration = Math.random() * 2 + 1;
        const delay = Math.random() * 0.5;

        coin
            .animate(
                [
                    { transform: "translateY(0)", opacity: 1 },
                    { transform: `translateY(${window.innerHeight}px)`, opacity: 0 },
                ],
                {
                    duration: duration * 1000,
                    delay: delay * 1000,
                    easing: "ease-in",
                    fill: "forwards",
                }
            )
            .onfinish = () => {
                document.body.removeChild(coin);
            };
    }

    const jar = document.querySelector(".jar");
    if (jar) {
        jar.animate(
            [
                { transform: "rotate(0deg)" },
                { transform: "rotate(10deg)" },
                { transform: "rotate(0deg)" },
            ],
            {
                duration: 500,
                iterations: 3,
                easing: "ease-in-out",
            }
        );
    }
}
