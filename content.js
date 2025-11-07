
console.log("iClicker AutoClicker CONTENT SCRIPT LOADED!");

let autoClickEnabled = true;
let lastPollDetected = false;
let lastAction = "Content script loaded successfully";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Received message in content script:", message);
    
    if (message.action === "toggle") {
        autoClickEnabled = message.enabled;
        lastAction = message.enabled ? "Enabled by user" : "Disabled by user";
        console.log("🔄 AutoClick:", autoClickEnabled);
        sendResponse({success: true, action: lastAction});
        return true;
    }
    else if (message.action === "getStatus") {
        const status = getCurrentStatus();
        console.log("Sending status:", status);
        sendResponse(status);
        return true;
    }

    else if (message.action === "ping") {
        console.log("Content script is alive");
        sendResponse({alive: true, message: "Content script is running"});
        return true;
    }
    
    return true;
});


function isPollActive() {
    const pageText = document.body.innerText || '';
    return pageText.includes('Multiple Choice') && /Question\s+\d+/.test(pageText);
}


function findClickerOptions() {
    const options = [];
    const letters = ['a', 'b', 'c', 'd', 'e'];
    
    for (let letter of letters) {
        const button = document.getElementById(`multiple-choice-${letter}`);
        if (button && button.offsetParent !== null && !button.disabled) {
            options.push(button);
        }
    }
    return options;
}


function checkAndClickPoll() {
    if (!autoClickEnabled) return;

    try {
        const pollActive = isPollActive();
        const options = findClickerOptions();
        
        if (!pollActive || options.length === 0) {

            if (lastPollDetected) {
                lastAction = "Poll ended";
                lastPollDetected = false;
            }
            return;
        }

        if (!lastPollDetected) {
            lastAction = "New poll detected - clicking...";
            const randomOption = options[Math.floor(Math.random() * options.length)];
            const optionText = randomOption.textContent.trim();
            
            console.log("Clicking:", optionText);
            
            setTimeout(() => {
                randomOption.click();
                lastAction = `Clicked ${optionText}`;
                console.log("✅", lastAction);
            }, 500);

            lastPollDetected = true;
        }
    } 
    
    catch (err) {
        lastAction = "Error: " + err.message;
        console.error("❌", err);
    }
}

// Status function
function getCurrentStatus() {
    const pollActive = isPollActive();
    const buttons = findClickerOptions();
    
    return {
        autoClickEnabled: autoClickEnabled,
        pollActive: pollActive,
        buttonsFound: buttons.length,
        lastAction: lastAction,
        contentScriptLoaded: true
    };
}


console.log("Starting poll checker...");
setInterval(checkAndClickPoll, 2000);

// Test function
window.debugAutoClicker = function() {
    console.log("=== DEBUG ===");
    console.log("AutoClick enabled:", autoClickEnabled);
    console.log("Poll active:", isPollActive());
    console.log("Buttons found:", findClickerOptions().length);
    console.log("Last action:", lastAction);
    console.log("=============");
};

console.log("iClicker AutoClicker ready! Type 'debugAutoClicker()' in console.");