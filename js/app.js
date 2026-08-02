/**
 * app.js — shared wallet connection logic for smartWage
 * Loaded on every page. Exposes globals: provider, signer, userAddress.
 */

// ─────────────────────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────────────────────

const NETWORKS = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Mumbai Testnet",
    31337: "Localhost / Hardhat",
};

// Block explorer "tx" URL templates, keyed by chainId. Networks without a
// public explorer (e.g. local Hardhat) are intentionally omitted.
const EXPLORER_TX_URLS = {
    1: "https://etherscan.io/tx/",
    5: "https://goerli.etherscan.io/tx/",
    11155111: "https://sepolia.etherscan.io/tx/",
    137: "https://polygonscan.com/tx/",
    80001: "https://mumbai.polygonscan.com/tx/",
};

function getExplorerTxUrl(chainId, txHash) {
    const base = EXPLORER_TX_URLS[Number(chainId)];
    return base ? `${base}${txHash}` : null;
}

// ─────────────────────────────────────────────────────────────
//  Module state
// ─────────────────────────────────────────────────────────────

let provider = null;
let signer = null;
let userAddress = null;
let isConnecting = false;

// ─────────────────────────────────────────────────────────────
//  Toast notifications
// ─────────────────────────────────────────────────────────────

function showToast(message, type = "info", durationMs = 4000) {
    const container = document.getElementById("notification");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.4s";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, durationMs);
}

// ─────────────────────────────────────────────────────────────
//  Wallet connection
// ─────────────────────────────────────────────────────────────

async function connectWallet() {
    if (isConnecting) return false;
    if (typeof window.ethereum === "undefined") {
        if (window.location.protocol === "file:") {
            showToast(
                "MetaMask cannot inject into file:// pages. Please serve the app over http:// or visit the live site.",
                "error",
                8000
            );
        } else {
            showToast("MetaMask is not installed. Please install it to use smartWage.", "error", 6000);
        }
        return false;
    }

    isConnecting = true;
    try {
        sessionStorage.removeItem("sw_disconnected");
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        updateWalletUI(userAddress);
        showToast(`Wallet connected: ${shortAddress(userAddress)}`, "success");

        // Listen for account / network changes
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        // Allow per-page initialisation to run after a manual connect
        try {
            if (typeof onWalletReady === "function") {
                await onWalletReady();
            }
        } catch (e) {
            console.error("onWalletReady failed", e);
        }

        return true;
    } catch (err) {
        const msg = err.code === 4001
            ? "Connection rejected by user."
            : `Connection failed: ${err.message}`;
        showToast(msg, "error");
        return false;
    } finally {
        isConnecting = false;
    }
}

function disconnectWallet() {
    if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
    }
    userAddress = null;
    signer = null;
    provider = null;
    sessionStorage.setItem("sw_disconnected", "1");
    sessionStorage.setItem("sw_show_disconnected_toast", "1");
    updateWalletUI(null);
    window.location.reload();
}

function handleChainChanged() {
    window.location.reload();
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        showToast("Wallet disconnected.", "info");
        userAddress = null;
        signer = null;
        updateWalletUI(null);
    } else {
        window.location.reload();
    }
}

async function getConnectedAccounts() {
    if (typeof window.ethereum === "undefined") return [];
    try {
        return await window.ethereum.request({ method: "eth_accounts" });
    } catch {
        return [];
    }
}

function copyAddressToClipboard(addr) {
    if (!addr) return;
    const fallbackCopy = () => {
        try {
            const el = document.createElement("textarea");
            el.value = addr;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            showToast("Address copied to clipboard!", "success", 2000);
        } catch {
            showToast("Failed to copy address.", "error", 2000);
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(() => {
            showToast("Address copied to clipboard!", "success", 2000);
        }).catch(() => {
            fallbackCopy();
        });
    } else {
        fallbackCopy();
    }
}

// ─────────────────────────────────────────────────────────────
//  UI helpers
// ─────────────────────────────────────────────────────────────

function shortAddress(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function formatWei(wei) {
    try {
        return ethers.formatEther(wei) + " ETH";
    } catch {
        return wei + " wei";
    }
}

function formatFrequency(seconds) {
    const n = Number(seconds);
    if (n === 0) return "—";
    if (n < 3600) return `${Math.round(n / 60)} minutes`;
    if (n < 86400) return `${Math.round(n / 3600)} hours`;
    if (n < 604800) return `${Math.round(n / 86400)} days`;
    if (n < 2592000) return `${Math.round(n / 604800)} weeks`;
    return `${Math.round(n / 2592000)} months`;
}

function formatTimestamp(ts) {
    const n = Number(ts);
    if (n === 0) return "Never";
    return new Date(n * 1000).toLocaleString();
}

function updateWalletUI(address) {
    const statusEl = document.getElementById("wallet-status");
    const addrEl = document.getElementById("wallet-address");
    const connectBtn = document.getElementById("connect-btn");

    if (statusEl) {
        statusEl.className = address ? "wallet-status connected" : "wallet-status";
        const dot = statusEl.querySelector(".dot");
        if (dot) {
            const statusText = statusEl.querySelector(".status-text");
            if (statusText) {
                statusText.textContent = address ? "Connected" : "Not connected";
            }
        }
    }

    if (addrEl) {
        addrEl.textContent = address ? shortAddress(address) : "";
        addrEl.title = address ? `${address} — click to copy` : "";
        addrEl.style.display = address ? "inline-block" : "none";
        if (address) {
            addrEl.classList.add("wallet-address-clickable");
            addrEl.setAttribute("role", "button");
            addrEl.tabIndex = 0;
            addrEl.setAttribute("aria-label", "Copy wallet address");
        } else {
            addrEl.classList.remove("wallet-address-clickable");
            addrEl.removeAttribute("role");
            addrEl.removeAttribute("tabindex");
            addrEl.removeAttribute("aria-label");
        }
        addrEl.onclick = address ? () => copyAddressToClipboard(address) : null;
        addrEl.onkeydown = address
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    copyAddressToClipboard(address);
                }
            }
            : null;
    }

    if (connectBtn) {
        if (address) {
            connectBtn.textContent = "Disconnect";
            connectBtn.setAttribute("aria-label", "Disconnect wallet");
            connectBtn.classList.remove("btn-primary");
            connectBtn.classList.add("btn-danger");
            connectBtn.disabled = false;
        } else {
            connectBtn.textContent = "Connect Wallet";
            connectBtn.setAttribute("aria-label", "Connect wallet");
            connectBtn.classList.remove("btn-danger");
            connectBtn.classList.add("btn-primary");
            connectBtn.disabled = false;
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Auto-connect on page load (if already authorised)
// ─────────────────────────────────────────────────────────────

async function tryAutoConnect() {
    if (sessionStorage.getItem("sw_disconnected")) return false;
    const accounts = await getConnectedAccounts();
    if (accounts.length > 0) {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        updateWalletUI(userAddress);
        return true;
    }
    return false;
}

document.addEventListener("DOMContentLoaded", () => {
    // Show deferred toast from disconnect
    if (sessionStorage.getItem("sw_show_disconnected_toast")) {
        sessionStorage.removeItem("sw_show_disconnected_toast");
        showToast("Wallet disconnected.", "info");
    }

    // Wire up the connect/disconnect button if present
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) {
        connectBtn.addEventListener("click", () => {
            if (userAddress) {
                disconnectWallet();
            } else {
                connectWallet();
            }
        });
    }

    tryAutoConnect().then((connected) => {
        if (connected && typeof onWalletReady === "function") {
            onWalletReady();
        }
    });
});
