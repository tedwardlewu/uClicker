console.log("iClicker AutoClicker — Content Script Loaded");

let autoDetect = true;
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

// Detect poll and click a random option
function checkAndClickPoll() {
    if (!autoDetect) return;

    try {
        const pollActive = isPollActive();
        const options = pollActive ? findClickerOptions() : [];

        if (!pollActive || options.length === 0) {
            if (lastPollDetected) {
                lastAction = "Poll ended";
                lastPollDetected = false;
            }
            return;
        }

        if (!lastPollDetected) {
            lastAction = "New poll detected";

            // Choose random option
            const randomOption = options[Math.floor(Math.random() * options.length)];
            const optionText = randomOption.textContent.trim();

            console.log("Clicking option:", optionText);

            // Delay click slightly for realism
            setTimeout(() => {
                randomOption.click();
                lastAction = `Clicked option: ${optionText}`;
                console.log(lastAction);
            }, 500);

            lastPollDetected = true;
        }
    } catch (err) {
        lastAction = "Error: " + err.message;
        console.error("AutoClicker script error:", err);
    }
}

// Get current status for popup or messages
function getCurrentStatus() {
    const pollActive = isPollActive();
    const buttons = pollActive ? findClickerOptions() : [];
    return {
        autoDetect,
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
            autoDetect = !!message.enabled;
            lastAction = autoDetect ? "Enabled by user" : "Disabled by user";
            console.log("AutoClick status:", autoDetect);
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
console.log(`Starting poll checker with ${CHECK_INTERVAL}ms interval`);
setInterval(checkAndClickPoll, CHECK_INTERVAL);

// Debug helper
window.debugAutoClicker = function() {
    console.log("=== AutoClicker Debug Info ===");
    console.log("Detection Enabled:", autoDetect);
    console.log("Poll Active:", isPollActive());
    console.log("Buttons Found:", findClickerOptions().length);
    console.log("Last Action:", lastAction);
    console.log("==============================");
};
