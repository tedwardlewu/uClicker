document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        toggle: document.getElementById("toggleAuto"),
        statusText: document.getElementById("statusText"),
        connectionStatus: document.getElementById("connectionStatus"),
        lastUpdate: document.getElementById("lastUpdate"),
        pollStatus: document.getElementById("pollStatus"),
        activityStatus: document.getElementById("activityStatus"),
        activityLog: document.getElementById("activityLog")
    };

    let updateInterval;
    let isOnIclickerPage = false;

  
    chrome.storage.local.get(['alertEnabled'], (result) => {
        const enabled = result.alertEnabled !== false;
        elements.toggle.checked = enabled;
        upDate(enabled);
        checkCurrentTab();
    });

    elements.toggle.addEventListener("change", () => {
        const enabled = elements.toggle.checked;
        upDate(enabled);
        addLogEntry(`Alert system ${enabled ? 'enabled' : 'disabled'}`);

        chrome.storage.local.set({ alertEnabled: enabled });

        if (isOnIclickerPage) {
            message({action: "toggle", enabled: enabled})
                .then(() => addLogEntry("Settings updated", "success"))
                .catch(error => addLogEntry(`Failed to update: ${error}`, "error"));
        }
    });

    function upDate(enabled) {
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
            
            if (isOnIclickerPage) 
                {
                addLogEntry("Connected to iClicker page", "success");
                startLiveUpdates();
            } 
            
            else {
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

        message({action: "getStatus"})
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

    function message(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs.length === 0) {
                    reject("No active tab");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject("Content script not ready");
                    } 
                    
                    else if (response) {
                        resolve(response);
                    } 
                    
                    else {
                        reject("No response");
                    }
                });
            });
        });
    }

    function setConnectedState(status) {
        elements.pollStatus.textContent = status.pollActive ? "ACTIVE POLL" : "No Active Poll";
        elements.activityStatus.textContent = status.pollActive ? "ALERT: Answer Required!" : "Monitoring...";
        
        updateCardState('pollCard', status.pollActive);
        updateCardState('activityCard', status.pollActive);
        
      
        if (status.pollActive && !status.wasActive) {
            sendDesktopNotification("iClicker Alert", "A poll is active - answer now!");
            addLogEntry("Poll detected - sending alert", "warning");
        }
    }

    function updateCardState(cardId, isActive) {
        const card = document.getElementById(cardId);
        if (card) {
            card.className = `status-card ${isActive ? 'active-alert' : 'inactive'}`;
        }
    }

    function setDisconnectedState(error) {
        elements.pollStatus.textContent = "Disconnected";
        elements.activityStatus.textContent = "Offline";
        
        ['pollCard', 'activityCard'].forEach(cardId => {
            updateCardState(cardId, false);
        });
    }

    function sendDesktopNotification(title, message) {
        if (Notification.permission === "granted") {
            new Notification(title, { body: message, icon: "icon.png" });
        } 
        
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {

                if (permission === "granted") {
                    new Notification(title, { body: message, icon: "icon.png" });
                }
            });
        }
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
        
        
        const entries = elements.activityLog.getElementsByClassName('log-entry');
        
        if (entries.length > 6) {
            entries[0].remove();
        }
        
        elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
    }

    
    if ("Notification" in window) {
        Notification.requestPermission();
    }

  
    addLogEntry("Alert system started", "success");

   
    window.addEventListener('unload', () => {
        if (updateInterval) clearInterval(updateInterval);
    });
});