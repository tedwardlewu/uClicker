document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        toggle: document.getElementById("toggleAuto"),
        statusText: document.getElementById("statusText"),
        connectionStatus: document.getElementById("connectionStatus"),
        lastUpdate: document.getElementById("lastUpdate"),
        pollStatus: document.getElementById("pollStatus"),
        buttonStatus: document.getElementById("buttonStatus"),
        actionStatus: document.getElementById("actionStatus"),
        activityStatus: document.getElementById("activityStatus"),
        activityLog: document.getElementById("activityLog")
    };

    let updateInterval;
    let isOnIclickerPage = false;

    // Load saved state
    chrome.storage.local.get(['autoClickEnabled'], (result) => {
        const enabled = result.autoClickEnabled !== false;
        elements.toggle.checked = enabled;
        updateToggleDisplay(enabled);
        checkCurrentTab();
    });

    elements.toggle.addEventListener("change", () => {
        const enabled = elements.toggle.checked;
        updateToggleDisplay(enabled);
        addLogEntry(`AutoClicker ${enabled ? 'enabled' : 'disabled'}`);

        chrome.storage.local.set({ autoClickEnabled: enabled });

        if (isOnIclickerPage) {
            sendMessageToContentScript({action: "toggle", enabled: enabled})
                .then(() => addLogEntry("Settings updated", "success"))
                .catch(error => addLogEntry(`Failed to update: ${error}`, "error"));
        }
    });

    function updateToggleDisplay(enabled) {
        elements.statusText.textContent = enabled ? "ON" : "OFF";
        elements.statusText.className = enabled ? "status-enabled" : "status-disabled";
    }

    function checkCurrentTab() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) {
                showErrorMessage("No active tab found");
                return;
            }

            const currentTab = tabs[0];
            isOnIclickerPage = currentTab.url.includes('student.iclicker.com');
            
            if (isOnIclickerPage) {
                addLogEntry("Connected to iClicker page", "success");
                startLiveUpdates();
            } else {
                showErrorMessage("Please navigate to student.iclicker.com");
            }
        });
    }

    function startLiveUpdates() {
        updateStatus();
        updateInterval = setInterval(updateStatus, 2000);
    }

    function updateStatus() {
        elements.lastUpdate.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        if (!isOnIclickerPage) return;

        sendMessageToContentScript({action: "getStatus"})
            .then(status => {
                setConnectedState(status);
                elements.connectionStatus.className = "connection-status";
                elements.connectionStatus.title = "Connected to iClicker";
            })
            .catch(error => {
                setDisconnectedState(error);
                elements.connectionStatus.className = "connection-status disconnected";
                elements.connectionStatus.title = `Error: ${error}`;
            });
    }

    function sendMessageToContentScript(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs.length === 0) {
                    reject("No active tab");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject("Content script not ready");
                    } else if (response) {
                        resolve(response);
                    } else {
                        reject("No response");
                    }
                });
            });
        });
    }

    function setConnectedState(status) {
        elements.pollStatus.textContent = status.pollActive ? "Active Poll 🎯" : "No Poll";
        elements.buttonStatus.textContent = `${status.buttonsFound}/5`;
        elements.actionStatus.textContent = status.lastAction || "Ready";
        
        // Update card states
        updateCardState('pollCard', status.pollActive);
        updateCardState('buttonsCard', status.buttonsFound > 0);
        updateCardState('actionCard', !status.lastAction.includes('Error'));
        
        if (status.pollActive && status.buttonsFound > 0) {
            elements.activityStatus.textContent = "Ready to Click!";
            updateCardState('activityCard', true);
        } else {
            elements.activityStatus.textContent = "Waiting...";
            updateCardState('activityCard', false);
        }
    }

    function updateCardState(cardId, isActive) {
        const card = document.getElementById(cardId);
        if (card) {
            card.className = `status-card ${isActive ? 'active' : 'inactive'}`;
        }
    }

    function setDisconnectedState(error) {
        elements.pollStatus.textContent = "Disconnected";
        elements.buttonStatus.textContent = "0";
        elements.actionStatus.textContent = error;
        elements.activityStatus.textContent = "Offline";
        
        // Set all cards to inactive
        ['pollCard', 'buttonsCard', 'actionCard', 'activityCard'].forEach(cardId => {
            updateCardState(cardId, false);
        });
    }

    function showErrorMessage(message) {
        addLogEntry(message, "error");
        setDisconnectedState(message);
        elements.connectionStatus.className = "connection-status disconnected";
    }

    function addLogEntry(message, type = "") {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        elements.activityLog.appendChild(entry);
        
        // Keep only last 6 entries
        const entries = elements.activityLog.getElementsByClassName('log-entry');
        if (entries.length > 6) {
            entries[0].remove();
        }
        
        elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
    }

    // Add initial log entry
    addLogEntry("Popup opened", "success");

    // Clean up
    window.addEventListener('unload', () => {
        if (updateInterval) clearInterval(updateInterval);
    });
});