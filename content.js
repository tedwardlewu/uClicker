console.log("iClicker Poll Detector — Content Script Loaded");

let detectionEnabled = true;
let lastPollDetected = false;
let lastAction = "Content script loaded successfully";

let cachedBodyText = '';
let textCacheTime = 0;
const CACHE_DURATION = 1000; // Cache page text for 1 second

const CHECK_INTERVAL = 2000; // Poll checking interval in ms

// Get page text with caching
function getPageText() {
    const now = Date.now();
    if (now - textCacheTime > CACHE_DURATION) {
        cachedBodyText = document.body.innerText || '';
        textCacheTime = now;
    }
    return cachedBodyText;
}

// Check if a poll is active
function isPollActive() {
    const pageText = getPageText();
    return pageText.includes('Multiple Choice') && /Question\s+\d+/.test(pageText);
}

// Find available poll option buttons
function findClickerOptions() {
    const options = [];
    for (let i = 0; i < 5; i++) {
        const letter = String.fromCharCode(97 + i); // 'a' to 'e'
        const button = document.getElementById(`multiple-choice-${letter}`);
        if (button && button.offsetParent !== null && !button.disabled) {
            options.push(button);
        }
    }
    return options;
}

// Visual notification on the page
function showPageNotification(message, type = 'info') {
    // Remove existing notification if present
    const existing = document.getElementById('poll-detector-notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'poll-detector-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'poll' ? '#4caf50' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        font-size: 16px;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Play notification sound (optional - using built-in audio)
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+DyvmwhBjiS1/HMeSwFJHfH8N2RQAoVXrTp66hVFApGn+Dyv2wh');
    audio.volume = 0.3;
    audio.play().catch(err => console.log('Could not play sound:', err));
}

// Detect poll and notify user
function checkAndNotifyPoll() {
    if (!detectionEnabled) return;

    try {
        const pollActive = isPollActive();
        const options = pollActive ? findClickerOptions() : [];

        if (!pollActive || options.length === 0) {
            if (lastPollDetected) {
                lastAction = "Poll ended";
                lastPollDetected = false;
                showPageNotification('Poll has ended', 'info');
            }
            return;
        }

        if (!lastPollDetected) {
            lastAction = `New poll detected with ${options.length} options`;
            console.log(lastAction);
            
            // Notify the user
            showPageNotification(`🔔 New Poll Available! (${options.length} options)`, 'poll');
            playNotificationSound();
            
            // Send message to popup/background
            chrome.runtime.sendMessage({
                action: 'pollDetected',
                optionCount: options.length
            }).catch(err => console.log('Could not send message:', err));

            lastPollDetected = true;
        }
    } catch (err) {
        lastAction = "Error: " + err.message;
        console.error("Poll Detector script error:", err);
    }
}

// Get current status for popup or messages
function getCurrentStatus() {
    const pollActive = isPollActive();
    const buttons = pollActive ? findClickerOptions() : [];
    return {
        detectionEnabled,
        pollActive,
        buttonsFound: buttons.length,
        lastAction,
        contentScriptLoaded: true
    };
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    switch (message.action) {
        case "toggle":
            detectionEnabled = !!message.enabled;
            lastAction = detectionEnabled ? "Detection enabled by user" : "Detection disabled by user";
            console.log("Poll detection status:", detectionEnabled);
            sendResponse({ success: true, action: lastAction });
            break;

        case "getStatus":
            sendResponse(getCurrentStatus());
            break;

        case "ping":
            sendResponse({ alive: true, message: "Content script is running" });
            break;

        default:
            console.warn("Unknown action:", message.action);
    }

    return true; // Keep message channel open for async response
});

// Start poll checker interval
console.log(`Starting poll detector with ${CHECK_INTERVAL}ms interval`);
setInterval(checkAndNotifyPoll, CHECK_INTERVAL);

// Debug helper
window.debugPollDetector = function() {
    console.log("=== Poll Detector Debug Info ===");
    console.log("Detection Enabled:", detectionEnabled);
    console.log("Poll Active:", isPollActive());
    console.log("Buttons Found:", findClickerOptions().length);
    console.log("Last Action:", lastAction);
    console.log("==============================");
};
