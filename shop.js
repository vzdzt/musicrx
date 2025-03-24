console.log("shop.js loaded");

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
    attachCopyButtonListeners(); // New function for copy buttons
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

    const disconnectWalletButton = document.getElementById("disconnectWallet");
    if (disconnectWalletButton) {
        console.log("Disconnect Wallet button found, attaching event listener");
        disconnectWalletButton.removeEventListener("click", disconnectWallet);
        disconnectWalletButton.addEventListener("click", disconnectWallet);
    }
}

// Handle the click event for wallet buttons
function handleWalletButtonClick(event) {
    console.log("Wallet button clicked:", event);
    showWalletModal();
}

// Web3 wallet connection logic
const ethProvider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
const solConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
const myEthAddress = "0x24A77F76fe0CF427f26A9E49F33f7E9287217250"; // Your MetaMask address (ETH)
const mySolAddress = "7YCdysgzcxuJTrGe5XfyKpobagonNmwT8ygPvpEBwUUr"; // Your Phantom address (SOL)
window.connectedChain = null;
window.connectedAddress = null;

async function connectWallet(walletType) {
    const hasEth = window.ethereum;
    const hasSol = window.solana && window.solana.isPhantom;
    const connectWalletButton = document.getElementById("connectWallet");
    const disconnectWalletButton = document.getElementById("disconnectWallet");
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
            if (connectWalletButton) connectWalletButton.style.display = "none";
            if (disconnectWalletButton) disconnectWalletButton.style.display = "inline-block";
            console.log("MetaMask connected:", address);
        } catch (error) {
            console.error("ETH connection failed:", error);
            alert("ETH connection failed: " + error.message);
        }
    } else if (walletType === "sol" && hasSol) {
        try {
            console.log("Attempting to connect Phantom...");
            await window.solana.connect();
            const address = window.solana.publicKey.toString();
            window.connectedAddress = address;
            window.connectedChain = "sol";
            if (walletStatus) walletStatus.textContent = `SOL: ${address.slice(0, 6)}...`;
            if (connectWalletButton) connectWalletButton.style.display = "none";
            if (disconnectWalletButton) disconnectWalletButton.style.display = "inline-block";
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
    const tipOutput = document.getElementById("tipStatus");
    try {
        if (tipOutput) tipOutput.textContent = `Sending ${amount} SOL...`;
        const fromPubkey = new solanaWeb3.PublicKey(window.connectedAddress);
        const toPubkey = new solanaWeb3.PublicKey(mySolAddress);

        // Create the transaction
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
            })
        );

        // Fetch recent blockhash
        const { blockhash, lastValidBlockHeight } = await solConnection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Use sendTransaction to let Phantom handle signing and sending
        const signature = await solConnection.sendTransaction(transaction, [], {
            skipPreflight: true,
            preflightCommitment: 'confirmed',
            signers: [],
        });

        // Confirm the transaction
        await solConnection.confirmTransaction({
            signature: signature,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
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

async function disconnectWallet() {
    if (window.connectedChain === "eth" && window.ethereum) {
        window.connectedAddress = null;
        window.connectedChain = null;
        console.log("MetaMask disconnected");
    } else if (window.connectedChain === "sol" && window.solana) {
        await window.solana.disconnect();
        window.connectedAddress = null;
        window.connectedChain = null;
        console.log("Phantom disconnected");
    }
    const connectWalletButton = document.getElementById("connectWallet");
    const disconnectWalletButton = document.getElementById("disconnectWallet");
    const walletStatus = document.getElementById("walletStatus");
    if (connectWalletButton) {
        connectWalletButton.textContent = "Connect Wallet";
        connectWalletButton.style.display = "inline-block";
    }
    if (disconnectWalletButton) disconnectWalletButton.style.display = "none";
    if (walletStatus) walletStatus.textContent = "";
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

// New function to attach copy button listeners
function attachCopyButtonListeners() {
    const copyButtons = document.querySelectorAll('.crypto-chip .copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const address = button.getAttribute('data-address');
            const cryptoLabel = button.parentElement.querySelector('.crypto-label').textContent;
            
            if (address) {
                navigator.clipboard.writeText(address)
                    .then(() => {
                        console.log(`Copied ${address} to clipboard`);
                        showCopyFeedback(cryptoLabel, true, button);
                    })
                    .catch(err => {
                        console.error('Clipboard API failed:', err);
                        try {
                            const tempInput = document.createElement('input');
                            tempInput.style.position = 'absolute';
                            tempInput.style.opacity = '0';
                            tempInput.value = address;
                            document.body.appendChild(tempInput);
                            tempInput.select();
                            document.execCommand('copy');
                            document.body.removeChild(tempInput);
                            showCopyFeedback(cryptoLabel, true, button);
                        } catch (fallbackErr) {
                            console.error('Fallback copy failed:', fallbackErr);
                            showCopyFeedback(cryptoLabel, false, button);
                        }
                    });
            }
        });
    });

    // Feedback function with visual indication
    function showCopyFeedback(cryptoLabel, success, button) {
        if (success) {
            alert(`${cryptoLabel} address copied to clipboard!`);
            button.style.color = '#00ff00';
            setTimeout(() => {
                button.style.color = 'var(--primary)';
            }, 1000);
        } else {
            alert(`Failed to copy ${cryptoLabel} address. Please copy manually: ${address}`);
        }
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
