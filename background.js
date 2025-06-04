// This file listens for commands (hotkeys) and sends messages to the content script.
chrome.runtime.onInstalled.addListener(() => {
    console.log('Speed Reader extension installed.');
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        // This command is triggered by the default hotkey for the action (popup).
        // We want to toggle highlighting on the active tab.
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const tabId = tabs[0].id;
                // Get stored settings to pass to content script for hotkey start.
                chrome.storage.local.get(['speed', 'color', 'groupSize'], (result) => {
                    const settings = {
                        speed: result.speed || 300, // Default if not found
                        color: result.color || '#add8e6', // Default if not found
                        groupSize: result.groupSize || 1 // Default if not found
                    };
                    // Send a message to the content script in the active tab to toggle highlighting
                    // and pass the retrieved settings.
                    chrome.tabs.sendMessage(tabId, { action: 'toggleHighlighting', ...settings });
                });
            }
        });
    }
});
