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

// ─────────────────────────────────────────────────────────────
//  Module state
// ─────────────────────────────────────────────────────────────

let provider = null;
let signer = null;
let userAddress = null;

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

    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        updateWalletUI(userAddress);
        showToast(`Wallet connected: ${shortAddress(userAddress)}`, "success");

        // Listen for account / network changes
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", () => window.location.reload());

        return true;
    } catch (err) {
        const msg = err.code === 4001
            ? "Connection rejected by user."
            : `Connection failed: ${err.message}`;
        showToast(msg, "error");
        return false;
    }
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
        addrEl.title = address || "";
        addrEl.style.display = address ? "inline-block" : "none";
    }

    if (connectBtn) {
        connectBtn.textContent = address ? "Connected ✓" : "Connect Wallet";
        connectBtn.disabled = !!address;
    }
}

// ─────────────────────────────────────────────────────────────
//  Auto-connect on page load (if already authorised)
// ─────────────────────────────────────────────────────────────

async function tryAutoConnect() {
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
    // Wire up the connect button if present
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) {
        connectBtn.addEventListener("click", connectWallet);
    }

    tryAutoConnect().then((connected) => {
        if (connected && typeof onWalletReady === "function") {
            onWalletReady();
        }
    });
});
