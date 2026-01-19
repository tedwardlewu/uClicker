
chrome.runtime.onInstalled.addListener(() => {
    console.log("iClicker AutoClicker installed");
    chrome.storage.local.set({ autoClickEnabled: true });
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('student.iclicker.com')) {
        console.log("iClicker page loaded, ensuring content script injection");
        

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            console.log("Content script injected successfully");
        }).catch(err => {
            console.log("Content script injection failed:", err);
        });
    }
});