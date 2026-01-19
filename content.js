console.log("iClicker AutoClicker CONTENT SCRIPT LOADED");

let autoDetect = true;
let lastPollDetected = false;
let lastAction = "Content script loaded successfully";
let cachedBodyText = '';
let textCacheTime = 0;
const CACHE_DURATION = 1000; 

function getPageText() {
    const now = Date.now();
    if (now - textCacheTime > CACHE_DURATION) {
        cachedBodyText = document.body.innerText || '';
        textCacheTime = now;
    }
    return cachedBodyText;
}

function isPollActive() {
    const pageText = getPageText();
    return pageText.includes('Multiple Choice') && /Question\s+\d+/.test(pageText);
}

function findClickerOptions() {
    const options = [];
  
    for (let i = 0; i < 5; i++) {
        const letter = String.fromCharCode(97 + i); 
        const button = document.getElementById(`multiple-choice-${letter}`);
        if (button && button.offsetParent !== null && !button.disabled) {
            options.push(button);
        }
    }

    return options;
}

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
            const randomOption = options[Math.floor(Math.random() * options.length)];
            const optionText = randomOption.textContent.trim();
            
            console.log("Clicking option:", optionText);
            
            setTimeout(() => {
                randomOption.click();
                lastAction = `Clicked ${optionText}`;
                console.log("", lastAction);
            }, 500);

            lastPollDetected = true;
        }
    } catch (err) {
        lastAction = "Error: " + err.message;
        console.error("Script error:", err);
    }
}

function getCurrentStatus() {
    const pollActive = isPollActive();
    const buttons = pollActive ? findClickerOptions() : [];
    
    return {
        autoDetect: autoDetect,
        pollActive: pollActive,
        buttonsFound: buttons.length,
        lastAction: lastAction,
        contentScriptLoaded: true
    };
}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
    
    if (message.action === "toggle") {
        autoDetect = message.enabled;
        lastAction = message.enabled ? "Enabled by user" : "Disabled by user";
        console.log("AutoClick status:", autoDetect);
        sendResponse({success: true, action: lastAction});
    }

    else if (message.action === "getStatus") {
        const status = getCurrentStatus();
        sendResponse(status);
    }

    else if (message.action === "ping") {
        sendResponse({alive: true, message: "Content script is running"});
    }
    
    return true;
});


const CHECK_INTERVAL = 2000;
console.log("Starting poll checker with", CHECK_INTERVAL + "ms interval");
setInterval(checkAndClickPoll, CHECK_INTERVAL);

window.debugAutoClicker = function() {
    console.log("Debug Info:");
    console.log("Detection Enabled:", autoDetect);
    console.log("Poll active:", isPollActive());
    console.log("Buttons found:", findClickerOptions().length);
    console.log("Last action:", lastAction);
};