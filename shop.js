
// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // Copy Address Functionality
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

    // Countdown Timer
    const countdownDate = new Date("April 1, 2025 00:00:00").getTime();
    
    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("days").textContent = String(days).padStart(2, '0');
        document.getElementById("hours").textContent = String(hours).padStart(2, '0');
        document.getElementById("minutes").textContent = String(minutes).padStart(2, '0');
        document.getElementById("seconds").textContent = String(seconds).padStart(2, '0');

        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("countdown-timer").innerHTML = "Shop is Now Open!";
        }
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // Wallet Connection (Basic Placeholder)
    const connectWalletButtons = document.querySelectorAll('#connectWallet, #connectWalletShop');
    const walletStatus = document.getElementById('walletStatus');
    
    connectWalletButtons.forEach(button => {
        button.addEventListener('click', async () => {
            try {
                if (typeof window.ethereum !== 'undefined') {
                    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                    walletStatus.textContent = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
                    button.textContent = 'Wallet Connected';
                } else if (typeof window.solana !== 'undefined') {
                    const response = await window.solana.connect();
                    walletStatus.textContent = `Connected: ${response.publicKey.toString().slice(0, 6)}...${response.publicKey.toString().slice(-4)}`;
                    button.textContent = 'Wallet Connected';
                } else {
                    alert('Please install a Web3 wallet (MetaMask or Phantom)');
                }
            } catch (error) {
                console.error('Wallet connection failed:', error);
                walletStatus.textContent = 'Connection Failed';
            }
        });
    });

    // Theme Toggle (assuming you have this in your main script.js too)
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
        themeToggle.title = document.body.classList.contains('light-theme') ? 'Dark Mode' : 'Normal Mode';
    });

    // Load saved theme
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.title = 'Dark Mode';
    }

    // Back to Top
    const backToTop = document.getElementById('backToTop');
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Show/hide back to top button
    window.addEventListener('scroll', () => {
        backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
});
