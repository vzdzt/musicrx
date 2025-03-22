document.addEventListener("DOMContentLoaded", () => {
    const ethProvider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
    const solConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
    const myEthAddress = "0x24A77F76fe0CF427f26A9E49F33f7E9287217250"; // Your MetaMask address
    const mySolAddress = "7YCdysgzcxuJTrGe5XfyKpobagonNmwT8ygPvpEBwUUr"; // Your Phantom address
    window.connectedChain = null;
    window.connectedAddress = null;
    let walletConnectProvider = null;

    async function connectWallet() {
        const hasEth = window.ethereum;
        const hasSol = window.solana && window.solana.isPhantom;
        const connectWalletButton = document.getElementById("connectWallet");
        const walletStatus = document.getElementById("walletStatus");

        if (!hasEth && !hasSol) {
            alert("Please install MetaMask, Phantom, or a WalletConnect-compatible wallet!");
            return;
        }

        let choice = prompt("Which wallet would you like to connect? Type 'ETH' for MetaMask, 'SOL' for Phantom, or 'WC' for WalletConnect:");
        if (!choice) return; // User canceled the prompt
        choice = choice.toLowerCase();

        if ((hasEth && choice === "eth") || (hasEth && !hasSol && choice !== "sol" && choice !== "wc")) {
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
        } else if ((hasSol && choice === "sol") || (hasSol && !hasEth && choice !== "eth" && choice !== "wc")) {
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
        } else if (choice === "wc") {
            try {
                const { EthereumProvider } = await import('https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.11.0/+esm');
                walletConnectProvider = await EthereumProvider.init({
                    projectId: "43c4d9871d34c95b6ecad88155711a62", // Your WalletConnect project ID
                    chains: [1], // Ethereum mainnet
                    showQrModal: true,
                });
                await walletConnectProvider.connect();
                const provider = new ethers.providers.Web3Provider(walletConnectProvider);
                const signer = provider.getSigner();
                const address = await signer.getAddress();
                window.connectedAddress = address;
                window.connectedChain = "eth"; // WalletConnect uses ETH
                if (walletStatus) {
                    walletStatus.textContent = `WC: ${address.slice(0, 6)}...`;
                }
                if (connectWalletButton) {
                    connectWalletButton.textContent = "Wallet Connected";
                }
            } catch (error) {
                console.error("WalletConnect connection failed:", error);
                alert("WalletConnect connection failed: " + error.message);
            }
        } else {
            alert("Invalid choice! Please type 'ETH', 'SOL', or 'WC'.");
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

    // Event Listeners for Web3 Buttons
    document.getElementById("connectWallet")?.addEventListener("click", connectWallet);
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
});
