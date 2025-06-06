document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const themeToggleButton = document.getElementById('themeToggle');
    const onPageModeButton = document.getElementById('onPageModeButton');
    const pastedTextModeButton = document.getElementById('pastedTextModeButton');
    const presetButtons = document.querySelectorAll('.preset-button');
    const advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
    const manualControlsContainer = document.getElementById('manualControls');

    const speedRange = document.getElementById('speedRange');
    const speedDisplay = document.getElementById('speedDisplay');
    const groupSizeInput = document.getElementById('groupSize');
    const highlightColorInput = document.getElementById('highlightColor');

    const onPageControlsContainer = document.getElementById('onPageControlsContainer');
    const startButton = document.getElementById('startButton');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const stopButton = document.getElementById('stopButton');

    const pastedTextControlsContainer = document.getElementById('pastedTextControlsContainer');
    const pastedTextarea = document.getElementById('pastedText');
    const pastedTextMessage = document.getElementById('pastedTextMessage');
    const startPastedButton = document.getElementById('startPastedButton');
    const pauseResumePastedButton = document.getElementById('pauseResumePastedButton');
    const stopPastedButton = document.getElementById('stopPastedButton');

    // --- State Variables ---
    let currentSettings = {
        theme: 'system', // 'light', 'dark', 'system'
        activeMode: 'onPage', // 'onPage', 'pastedText'
        activePreset: 'focus', // 'comprehend', 'focus', 'blitz', or null for custom
        advancedModeEnabled: false,
        wpm: 250,
        groupSize: 6,
        highlightColor: '#add8e6'
    };
    let isHighlightingActive = false;
    let isPaused = false;

    const PRESET_CONFIG = {
        comprehend: { wpm: 150, groupSize: 4 },
        focus: { wpm: 250, groupSize: 6 },
        blitz: { wpm: 400, groupSize: 10 }
    };

    // --- Initialization ---
    loadSettings();

    // --- Settings Persistence ---
    function loadSettings() {
        chrome.storage.local.get('speedReaderSettings', (result) => {
            if (result.speedReaderSettings) {
                currentSettings = { ...currentSettings, ...result.speedReaderSettings };
            }
            applyTheme();
            applySettingsToUI();
            updateDynamicUIState(false, false); // Initial state
        });
    }

    function saveSettings() {
        chrome.storage.local.set({ speedReaderSettings: currentSettings }, () => {
            // console.log('Settings saved:', currentSettings);
        });
    }

    // --- Theme Management ---
    function applyTheme() {
        const htmlElement = document.documentElement;
        if (currentSettings.theme === 'dark' || (currentSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            htmlElement.classList.add('dark');
            themeToggleButton.textContent = '☀️'; // Sun icon for light mode
        } else {
            htmlElement.classList.remove('dark');
            themeToggleButton.textContent = '🌓'; // Moon icon for dark mode
        }
    }

    themeToggleButton.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            currentSettings.theme = 'light';
        } else {
            currentSettings.theme = 'dark';
        }
        // If system was active, clicking toggle makes it explicit light/dark
        applyTheme();
        saveSettings();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme();
        }
    });

    // --- UI Mode Management (On-Page vs Pasted Text) ---
    function setUIMode(mode) {
        currentSettings.activeMode = mode;
        if (mode === 'onPage') {
            onPageControlsContainer.classList.remove('hidden');
            pastedTextControlsContainer.classList.add('hidden');
            onPageModeButton.classList.add('active');
            pastedTextModeButton.classList.remove('active');
        } else {
            onPageControlsContainer.classList.add('hidden');
            pastedTextControlsContainer.classList.remove('hidden');
            onPageModeButton.classList.remove('active');
            pastedTextModeButton.classList.add('active');
        }
        updateDynamicUIState(false, false); // Reset buttons on mode switch
        saveSettings();
    }

    onPageModeButton.addEventListener('click', () => setUIMode('onPage'));
    pastedTextModeButton.addEventListener('click', () => setUIMode('pastedText'));

    // --- Preset Mode Management ---
    function applyPreset(presetName) {
        if (PRESET_CONFIG[presetName]) {
            currentSettings.activePreset = presetName;
            currentSettings.wpm = PRESET_CONFIG[presetName].wpm;
            currentSettings.groupSize = PRESET_CONFIG[presetName].groupSize;
            // Optionally, disable advanced mode when a preset is selected
            // currentSettings.advancedModeEnabled = false;
            // advancedSettingsToggle.checked = false;
            // manualControlsContainer.classList.add('hidden');
            applySettingsToUI();
            saveSettings();
        }
    }

    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            applyPreset(button.dataset.preset);
        });
    });

    // --- Advanced Settings Management ---
    advancedSettingsToggle.addEventListener('change', (e) => {
        currentSettings.advancedModeEnabled = e.target.checked;
        manualControlsContainer.classList.toggle('hidden', !currentSettings.advancedModeEnabled);
        if (!currentSettings.advancedModeEnabled && currentSettings.activePreset) {
            // If hiding advanced and a preset was active, re-apply preset values
            applyPreset(currentSettings.activePreset);
        }
        saveSettings();
    });

    // --- Apply All Loaded/Current Settings to UI Elements ---
    function applySettingsToUI() {
        // Set UI mode
        setUIMode(currentSettings.activeMode);

        // Set preset button active state
        presetButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === currentSettings.activePreset);
        });

        // Set advanced toggle and visibility
        advancedSettingsToggle.checked = currentSettings.advancedModeEnabled;
        manualControlsContainer.classList.toggle('hidden', !currentSettings.advancedModeEnabled);

        // Set manual control values
        speedRange.value = currentSettings.wpm;
        speedDisplay.textContent = `${currentSettings.wpm} WPM`;
        groupSizeInput.value = currentSettings.groupSize;
        highlightColorInput.value = currentSettings.highlightColor;
    }

    // --- Manual Control Event Listeners ---
    speedRange.addEventListener('input', () => {
        currentSettings.wpm = parseInt(speedRange.value);
        speedDisplay.textContent = `${currentSettings.wpm} WPM`;
        currentSettings.activePreset = null; // Custom setting
        presetButtons.forEach(btn => btn.classList.remove('active'));
        saveSettings();
    });

    groupSizeInput.addEventListener('change', () => {
        currentSettings.groupSize = parseInt(groupSizeInput.value);
        currentSettings.activePreset = null; // Custom setting
        presetButtons.forEach(btn => btn.classList.remove('active'));
        saveSettings();
    });

    highlightColorInput.addEventListener('input', () => {
        currentSettings.highlightColor = highlightColorInput.value;
        // Color change doesn't necessarily invalidate a preset's WPM/GroupSize
        // So, we don't nullify activePreset here unless desired.
        saveSettings();
    });
    
    // Keyboard navigation for WPM slider (basic example)
    speedRange.addEventListener('keydown', (e) => {
        let currentValue = parseInt(speedRange.value);
        const step = parseInt(speedRange.step) || 10;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            speedRange.value = Math.min(parseInt(speedRange.max), currentValue + step);
            speedRange.dispatchEvent(new Event('input'));
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            speedRange.value = Math.max(parseInt(speedRange.min), currentValue - step);
            speedRange.dispatchEvent(new Event('input'));
        }
    });


    // --- Update UI based on Highlighting State (Start/Stop/Pause buttons) ---
    function updateDynamicUIState(highlighting, paused) {
        isHighlightingActive = highlighting;
        isPaused = paused;

        const startBtn = currentSettings.activeMode === 'onPage' ? startButton : startPastedButton;
        const stopBtn = currentSettings.activeMode === 'onPage' ? stopButton : stopPastedButton;
        const pauseResumeBtn = currentSettings.activeMode === 'onPage' ? pauseResumeButton : pauseResumePastedButton;

        // Hide all action buttons initially, then show relevant ones
        startButton.classList.add('hidden');
        stopButton.classList.add('hidden');
        pauseResumeButton.classList.add('hidden');
        startPastedButton.classList.add('hidden');
        stopPastedButton.classList.add('hidden');
        pauseResumePastedButton.classList.add('hidden');

        if (highlighting) {
            stopBtn.classList.remove('hidden');
            pauseResumeBtn.classList.remove('hidden');
            pauseResumeBtn.textContent = paused ? 'Resume' : 'Pause';
        } else {
            startBtn.classList.remove('hidden');
        }
    }

    // --- Message Passing with Content Script ---
    async function sendMessageToContentScript(action, data = {}) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            try {
                // Ensure content script is injected before sending a message
                // This is more robust if the popup opens before content script auto-injects
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                chrome.tabs.sendMessage(tab.id, { action, ...data });
            } catch (error) {
                if (error.message.includes('Receiving end does not exist')) {
                    console.warn('Content script not available on this page or not yet loaded.');
                    // Optionally, show a message to the user in the popup
                    if (currentSettings.activeMode === 'onPage') {
                        // showPopupMessage('Cannot connect to the page. Try reloading the page or ensure it\'s not a restricted browser page.');
                    }
                } else {
                    console.error('Error sending message to content script:', error);
                }
            }
        }
    }

    // --- Action Button Event Listeners ---
    function getCommonHighlightData() {
        return {
            speed: currentSettings.wpm,
            color: currentSettings.highlightColor,
            groupSize: currentSettings.groupSize
        };
    }

    startButton.addEventListener('click', () => {
        sendMessageToContentScript('startHighlighting', getCommonHighlightData());
        updateDynamicUIState(true, false);
    });

    stopButton.addEventListener('click', () => {
        sendMessageToContentScript('stopHighlighting');
        updateDynamicUIState(false, false);
    });

    pauseResumeButton.addEventListener('click', () => {
        if (isPaused) {
            sendMessageToContentScript('resumeHighlighting', { speed: currentSettings.wpm });
            updateDynamicUIState(true, false);
        } else {
            sendMessageToContentScript('pauseHighlighting');
            updateDynamicUIState(true, true);
        }
    });

    startPastedButton.addEventListener('click', () => {
        const text = pastedTextarea.value.trim();
        if (!text) {
            pastedTextMessage.textContent = 'Please paste some text to read!';
            pastedTextMessage.classList.remove('hidden');
            setTimeout(() => pastedTextMessage.classList.add('hidden'), 3000);
            return;
        }
        pastedTextMessage.classList.add('hidden');
        sendMessageToContentScript('startPastedHighlighting', { text, ...getCommonHighlightData() });
        updateDynamicUIState(true, false);
    });

    stopPastedButton.addEventListener('click', () => {
        sendMessageToContentScript('stopHighlighting'); // stopHighlighting handles both modes
        updateDynamicUIState(false, false);
    });

    pauseResumePastedButton.addEventListener('click', () => {
        if (isPaused) {
            sendMessageToContentScript('resumeHighlighting', { speed: currentSettings.wpm });
            updateDynamicUIState(true, false);
        } else {
            sendMessageToContentScript('pauseHighlighting');
            updateDynamicUIState(true, true);
        }
    });

    // --- Listen for Messages from Content Script ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'highlightingStopped') {
            updateDynamicUIState(false, false);
        } else if (request.action === 'highlightingStarted') {
            updateDynamicUIState(true, false);
        } else if (request.action === 'highlightingPaused') {
            updateDynamicUIState(true, true);
        } else if (request.action === 'highlightingResumed') {
            updateDynamicUIState(true, false);
        } else if (request.action === 'hotkeyToggle') {
             // Hotkey only affects on-page mode
            if (currentSettings.activeMode !== 'onPage') {
                setUIMode('onPage');
            }
            updateDynamicUIState(request.isHighlightingActive, request.isPaused);
        } else if (request.action === 'updateWPMFromHotkey') {
            if (currentSettings.activeMode === 'onPage') {
                currentSettings.wpm = request.wpm;
                currentSettings.activePreset = null; // Hotkey WPM change makes it custom
                applySettingsToUI(); // Update slider and display
                saveSettings();
            }
        }
    });

    // --- Keyboard Shortcuts (Space for Pause/Play, Esc for Stop) ---
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
            // Don't interfere with typing in inputs/textarea
            // except for our WPM slider specific keys handled elsewhere
            if (e.target.id === 'speedRange' && (e.key.startsWith('Arrow') || e.code === 'Space' || e.key === 'Escape')) {
                 // Allow specific keys for speedRange, fall through for others
            } else {
                return;
            }
        }

        if (isHighlightingActive) {
            if (e.code === 'Space') {
                e.preventDefault();
                const pauseResumeBtn = currentSettings.activeMode === 'onPage' ? pauseResumeButton : pauseResumePastedButton;
                pauseResumeBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                const stopBtn = currentSettings.activeMode === 'onPage' ? stopButton : stopPastedButton;
                stopBtn.click();
            }
        }
    });
});