document.addEventListener('DOMContentLoaded', () => {
    // On-Page Mode Elements
    const onPageModeButton = document.getElementById('onPageModeButton');
    const onPageControls = document.getElementById('onPageControls');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const speedRange = document.getElementById('speedRange');
    const speedDisplay = document.getElementById('speedDisplay');
    const highlightColorInput = document.getElementById('highlightColor');
    const groupSizeInput = document.getElementById('groupSize');

    // Pasted Text Mode Elements
    const pastedTextModeButton = document.getElementById('pastedTextModeButton');
    const pastedTextControls = document.getElementById('pastedTextControls');
    const pastedTextarea = document.getElementById('pastedText');
    const startPastedButton = document.getElementById('startPastedButton');
    const pauseResumePastedButton = document.getElementById('pauseResumePastedButton');
    const stopPastedButton = document.getElementById('stopPastedButton');
    const pastedTextMessage = document.getElementById('pastedTextMessage');


    let isPaused = false;
    let isHighlightingActive = false; // Tracks if *any* highlighting is active (on-page or pasted)
    let currentMode = 'onPage'; // 'onPage' or 'pastedText'

    // --- UI Management Functions ---

    // Shows/hides controls based on the active mode
    function setMode(mode) {
        currentMode = mode;
        if (mode === 'onPage') {
            onPageControls.classList.remove('hidden');
            pastedTextControls.classList.add('hidden');
            onPageModeButton.classList.add('active');
            pastedTextModeButton.classList.remove('active');
        } else {
            onPageControls.classList.add('hidden');
            pastedTextControls.classList.remove('hidden');
            onPageModeButton.classList.remove('active');
            pastedTextModeButton.classList.add('active');
        }
        // Ensure buttons are reset when switching modes
        updateUI(false, false);
        // Hide any message boxes when switching modes
        hideMessageBox();
    }

    // Displays a temporary message in the popup
    function showMessageBox(message, type = 'warning') {
        pastedTextMessage.textContent = message;
        pastedTextMessage.classList.remove('hidden');
        // You can add different classes for 'error', 'success' etc.
        // For now, it uses the default warning style.
    }

    // Hides the message box
    function hideMessageBox() {
        pastedTextMessage.classList.add('hidden');
        pastedTextMessage.textContent = '';
    }

    // Updates the visibility and text of buttons based on highlighting state
    function updateUI(highlightingActive, paused) {
        isHighlightingActive = highlightingActive;
        isPaused = paused;

        if (currentMode === 'onPage') {
            if (highlightingActive) {
                startButton.classList.add('hidden');
                stopButton.classList.remove('hidden');
                pauseResumeButton.classList.remove('hidden');
                pauseResumeButton.textContent = paused ? 'Resume' : 'Pause';
            } else {
                startButton.classList.remove('hidden');
                stopButton.classList.add('hidden');
                pauseResumeButton.classList.add('hidden');
            }
            // Hide pasted text buttons
            startPastedButton.classList.remove('hidden');
            pauseResumePastedButton.classList.add('hidden');
            stopPastedButton.classList.add('hidden');

        } else { // currentMode === 'pastedText'
            if (highlightingActive) {
                startPastedButton.classList.add('hidden');
                stopPastedButton.classList.remove('hidden');
                pauseResumePastedButton.classList.remove('hidden');
                pauseResumePastedButton.textContent = paused ? 'Resume' : 'Pause';
            } else {
                startPastedButton.classList.remove('hidden');
                pauseResumePastedButton.classList.add('hidden');
                stopPastedButton.classList.add('hidden');
            }
            // Hide on-page buttons
            startButton.classList.remove('hidden'); // Ensure it's visible if they switch back
            stopButton.classList.add('hidden');
            pauseResumeButton.classList.add('hidden');
        }
    }

    // --- Event Listeners ---

    // Mode toggle buttons
    onPageModeButton.addEventListener('click', () => setMode('onPage'));
    pastedTextModeButton.addEventListener('click', () => setMode('pastedText'));


    // Load saved settings when the popup opens
    chrome.storage.local.get(['speed', 'color', 'groupSize', 'lastMode'], (result) => {
        if (result.speed) {
            speedRange.value = result.speed;
            speedDisplay.textContent = `${result.speed} WPM`;
        }
        if (result.color) {
            highlightColorInput.value = result.color;
        }
        if (result.groupSize) {
            groupSizeInput.value = result.groupSize;
        }
        // Set initial mode based on last used, or default to onPage
        setMode(result.lastMode || 'onPage');
    });

    // Update speed display when slider moves
    speedRange.addEventListener('input', () => {
        speedDisplay.textContent = `${speedRange.value} WPM`;
    });

    // Function to send message to content script
    async function sendMessageToContentScript(action, data = {}) {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            try {
                // Execute content script if not already injected (idempotent)
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                chrome.tabs.sendMessage(tab.id, { action, ...data });
            } catch (error) {
                console.error("Error executing or sending message to content script:", error);
            }
        }
    }

    // --- On-Page Highlighting Actions ---
    startButton.addEventListener('click', () => {
        hideMessageBox(); // Hide any previous messages
        const speed = parseInt(speedRange.value);
        const color = highlightColorInput.value;
        const groupSize = parseInt(groupSizeInput.value);

        // Save settings to storage
        chrome.storage.local.set({ speed, color, groupSize, lastMode: 'onPage' }, () => {
            console.log('On-Page settings saved:', { speed, color, groupSize });
        });

        sendMessageToContentScript('startHighlighting', { speed, color, groupSize });
        updateUI(true, false);
    });

    stopButton.addEventListener('click', () => {
        sendMessageToContentScript('stopHighlighting');
        updateUI(false, false);
    });

    pauseResumeButton.addEventListener('click', () => {
        hideMessageBox(); // Hide any previous messages
        const speed = parseInt(speedRange.value); // Get current speed for resume
        if (isPaused) {
            sendMessageToContentScript('resumeHighlighting', { speed });
            updateUI(true, false);
        } else {
            sendMessageToContentScript('pauseHighlighting');
            updateUI(true, true);
        }
    });

    // --- Pasted Text Highlighting Actions ---
    startPastedButton.addEventListener('click', () => {
        hideMessageBox(); // Hide any previous messages
        const text = pastedTextarea.value.trim();
        if (!text) {
            showMessageBox('Please paste some text to read!');
            return;
        }
        const speed = parseInt(speedRange.value); // Use same speed/color/group size settings
        const color = highlightColorInput.value;
        const groupSize = parseInt(groupSizeInput.value);

        // Save settings to storage
        chrome.storage.local.set({ speed, color, groupSize, lastMode: 'pastedText' }, () => {
            console.log('Pasted text settings saved:', { speed, color, groupSize });
        });

        sendMessageToContentScript('startPastedHighlighting', { text, speed, color, groupSize });
        updateUI(true, false);
    });

    pauseResumePastedButton.addEventListener('click', () => {
        hideMessageBox(); // Hide any previous messages
        const speed = parseInt(speedRange.value); // Get current speed for resume
        if (isPaused) {
            sendMessageToContentScript('resumeHighlighting', { speed });
            updateUI(true, false);
        } else {
            sendMessageToContentScript('pauseHighlighting');
            updateUI(true, true);
        }
    });

    stopPastedButton.addEventListener('click', () => {
        hideMessageBox(); // Hide any previous messages
        sendMessageToContentScript('stopHighlighting'); // stopHighlighting handles both modes
        updateUI(false, false);
    });


    // Listen for messages from content script (e.g., when highlighting stops naturally or hotkey is pressed)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'highlightingStopped') {
            updateUI(false, false);
        } else if (request.action === 'hotkeyToggle') {
            // Hotkey was pressed, update UI based on content script's current state
            // Hotkey only affects on-page mode, so ensure UI reflects that.
            setMode('onPage'); // Switch to on-page mode if hotkey was used
            updateUI(request.isHighlightingActive, request.isPaused);
        }
    });

    // Initial UI state check (assume not active on popup open, content script will send updates)
    updateUI(false, false);
});