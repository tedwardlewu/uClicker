const toggleDetection = document.getElementById('toggleDetection');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const pollStatus = document.getElementById('pollStatus');
const optionsCount = document.getElementById('optionsCount');
const logContent = document.getElementById('logContent');
const lastUpdate = document.getElementById('lastUpdate');
const pollStatusCard = document.getElementById('pollStatusCard');
const optionsCard = document.getElementById('optionsCard');

let logEntries = [];

function addLogEntry(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    
    logEntries.unshift(entry);
    if (logEntries.length > 10) {
        logEntries.pop();
    }
    
    logContent.innerHTML = '';
    logEntries.forEach(e => logContent.appendChild(e));
}

function updateLastUpdateTime() {
    const now = new Date();
    lastUpdate.textContent = now.toLocaleTimeString();
}

function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        
        if (!currentTab.url.includes('student.iclicker.com')) {
            connectionStatus.className = 'connection-status disconnected';
            pollStatus.textContent = 'Not on iClicker page';
            pollStatusCard.className = 'status-card inactive';
            optionsCount.textContent = 'N/A';
            optionsCard.className = 'status-card inactive';
            addLogEntry('Please navigate to an iClicker page', 'warning');
            return;
        }

        chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                connectionStatus.className = 'connection-status disconnected';
                pollStatus.textContent = 'Not connected';
                pollStatusCard.className = 'status-card inactive';
                addLogEntry('Content script not loaded', 'error');
                return;
            }

            if (response && response.contentScriptLoaded) {
                connectionStatus.className = 'connection-status';
                
                if (response.pollActive) {
                    pollStatus.textContent = '🔔 Active Poll Detected!';
                    pollStatusCard.className = 'status-card active-alert';
                    optionsCount.textContent = response.buttonsFound;
                    optionsCard.className = 'status-card active-alert';
                } else {
                    pollStatus.textContent = 'Waiting for poll...';
                    pollStatusCard.className = 'status-card waiting';
                    optionsCount.textContent = '0';
                    optionsCard.className = 'status-card';
                }

                if (response.lastAction) {
                    const logType = response.pollActive ? 'success' : 'info';
                    addLogEntry(response.lastAction, logType);
                }

                updateLastUpdateTime();
            }
        });
    });
}

toggleDetection.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggle', 
            enabled: enabled 
        }, (response) => {
            if (response && response.success) {
                statusText.textContent = enabled ? 'ENABLED' : 'DISABLED';
                statusText.className = enabled ? 'status-enabled' : 'status-disabled';
                addLogEntry(enabled ? 'Detection enabled' : 'Detection disabled', enabled ? 'success' : 'warning');
                
                chrome.storage.local.set({ pollDetectionEnabled: enabled });
            }
        });
    });
});

// Load saved state
chrome.storage.local.get('pollDetectionEnabled', (data) => {
    const enabled = data.pollDetectionEnabled !== false;
    toggleDetection.checked = enabled;
    statusText.textContent = enabled ? 'ENABLED' : 'DISABLED';
    statusText.className = enabled ? 'status-enabled' : 'status-disabled';
});

// Update status every 2 seconds
updateStatus();
setInterval(updateStatus, 2000);

// Initial log entry
addLogEntry('Poll detector initialized', 'success');
