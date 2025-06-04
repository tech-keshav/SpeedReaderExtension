let highlightInterval;
let currentGroupIndex = 0;
let groups = []; // Will store the grouped span elements
let originalBodyHtml = ''; // Stores the original HTML of the body
let originalScrollY = 0;
let currentHighlightColor = '#add8e6'; // Default color
let currentGroupSize = 1; // Default group size
let currentSpeed = 300; // Default speed, will be updated by messages

let isHighlightingActive = false; // Overall state: is *any* highlighting active?
let isPaused = false;
let isPastedTextMode = false; // New state: are we highlighting pasted text?

// Function to get all visible text nodes from the current document.
// This is used ONLY for on-page highlighting.
function getTextNodes(element) {
    let textNodes = [];
    for (let node of element.childNodes) {
        // Exclude script, style, and elements with display: none or visibility: hidden
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            const parentElement = node.parentElement;
            if (parentElement && window.getComputedStyle(parentElement).display !== 'none' && window.getComputedStyle(parentElement).visibility !== 'hidden') {
                textNodes.push(node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'NOSCRIPT') {
            // Recursively get text nodes from child elements that are visible
            if (window.getComputedStyle(node).display !== 'none' && window.getComputedStyle(node).visibility !== 'hidden') {
                textNodes = textNodes.concat(getTextNodes(node));
            }
        }
    }
    return textNodes;
}

// Function to escape HTML for safe re-insertion into innerHTML.
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Helper function to wrap raw text into group spans for highlighting.
// This is used by both on-page and pasted text modes.
function wrapTextInGroupSpans(text, groupSize) {
    // Regex to split text into words (\b\w+\b), non-word characters ([^\s\w]), and spaces (\s+).
    // This ensures punctuation and spaces are preserved correctly.
    const tokens = text.match(/\b\w+\b|[^\s\w]|\s+/g) || [];
    let html = '';
    let currentGroupTokens = [];

    for (let i = 0; i < tokens.length; i++) {
        currentGroupTokens.push(escapeHtml(tokens[i]));

        // If we've reached the desired group size or it's the last token, create a span.
        if (currentGroupTokens.length === groupSize || i === tokens.length - 1) {
            html += `<span class="speed-reader-word-group">${currentGroupTokens.join('')}</span>`;
            currentGroupTokens = [];
        }
    }
    return html;
}

// Function to prepare the document for highlighting.
// It handles both on-page text modification and creating an overlay for pasted text.
function prepareDocument(textToHighlight = null, groupSize) {
    // If any highlighting is currently active, stop it gracefully first.
    // This ensures a clean state before starting a new highlighting session.
    if (isHighlightingActive) {
        clearInterval(highlightInterval);
        restoreDocument(); // This will reset state and restore original HTML
    }

    // Save current page state before any modifications.
    // This `originalBodyHtml` will be used to fully restore the page later.
    originalScrollY = window.scrollY;
    originalBodyHtml = document.body.innerHTML;

    // Reset highlighting state variables for the new session.
    groups = [];
    currentGroupIndex = 0;
    isHighlightingActive = true;
    isPaused = false;

    if (textToHighlight) {
        // --- Pasted Text Mode ---
        isPastedTextMode = true;

        // Clear the current body content to make space for the reader overlay.
        // This provides a clean, distraction-free reading environment.
        document.body.innerHTML = '';

        // Create the main reader overlay container.
        const readerOverlay = document.createElement('div');
        readerOverlay.id = 'speed-reader-overlay';
        readerOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #f0f4f8; /* Light blue-gray background */
            color: #334155; /* Dark slate text color */
            font-family: 'Inter', sans-serif;
            font-size: 1.2rem;
            line-height: 1.6;
            padding: 2rem;
            overflow-y: auto; /* Enable scrolling for long texts */
            z-index: 99999; /* Ensure it's on top of everything */
            box-sizing: border-box; /* Include padding in width/height */
            display: flex;
            flex-direction: column;
            align-items: center; /* Center content horizontally */
            justify-content: flex-start; /* Align content to the top */
        `;

        // Create a close button for the reader overlay.
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close Reader';
        closeButton.style.cssText = `
            margin-bottom: 1.5rem;
            padding: 0.75rem 1.5rem;
            background-color: #ef4444; /* Red button */
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
        `;
        // Add hover effects for a better user experience.
        closeButton.onmouseover = () => closeButton.style.backgroundColor = '#dc2626';
        closeButton.onmouseout = () => closeButton.style.backgroundColor = '#ef4444';
        closeButton.onclick = restoreDocument; // Clicking this button restores the original page.

        // Create a div to hold the pasted text content.
        const contentDiv = document.createElement('div');
        contentDiv.id = 'speed-reader-content';
        contentDiv.style.cssText = `
            max-width: 800px; /* Constrain width for optimal readability */
            width: 100%;
            text-align: left;
            margin: 0 auto; /* Center the content block */
        `;
        // Populate the content div with the pasted text, wrapped in highlightable spans.
        contentDiv.innerHTML = wrapTextInGroupSpans(textToHighlight, groupSize);

        // Append elements to the overlay and then to the body.
        readerOverlay.appendChild(closeButton);
        readerOverlay.appendChild(contentDiv);
        document.body.appendChild(readerOverlay);

        // Collect the newly created word group spans from within the overlay.
        groups = Array.from(document.querySelectorAll('#speed-reader-content .speed-reader-word-group'));

    } else {
        // --- On-Page Highlighting Mode ---
        isPastedTextMode = false;

        // Get all visible text nodes from the current document body.
        const textNodes = getTextNodes(document.body);
        textNodes.forEach(node => {
            const parent = node.parentNode;
            if (parent) {
                const originalText = node.textContent;
                // Create a temporary div to parse the HTML string into DOM nodes.
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = wrapTextInGroupSpans(originalText, groupSize);
                // Insert the new span nodes before the original text node.
                while (tempDiv.firstChild) {
                    parent.insertBefore(tempDiv.firstChild, node);
                }
                // Remove the original text node.
                parent.removeChild(node);
            }
        });
        // Collect all the newly created word group spans from the entire document body.
        groups = Array.from(document.querySelectorAll('.speed-reader-word-group'));
    }
}

// Function to remove highlighting and restore the original document.
// This function handles restoration for both on-page and pasted text modes.
function restoreDocument() {
    // Only proceed if highlighting was active or paused to avoid unnecessary operations.
    if (!isHighlightingActive && !isPaused) {
        return;
    }

    // Clear any active interval to stop further highlighting.
    clearInterval(highlightInterval);

    // Restore the original body HTML. This is a robust way to clean up all injected spans
    // or remove the pasted text overlay, ensuring a clean return to the original page state.
    try {
        document.body.innerHTML = originalBodyHtml;
    } catch (e) {
        console.error("Error restoring document body HTML:", e);
        // Fallback: if innerHTML replacement fails (e.g., due to CSP or complex page),
        // try to remove injected spans and the overlay manually.
        document.querySelectorAll('.speed-reader-word-group').forEach(span => span.remove());
        const overlay = document.getElementById('speed-reader-overlay');
        if (overlay) overlay.remove();
    }

    // Reset all internal state variables to their initial values.
    groups = [];
    currentGroupIndex = 0;
    isHighlightingActive = false;
    isPaused = false;
    isPastedTextMode = false; // Important: reset this state for the next session.

    // Restore the scroll position to where it was before highlighting started.
    window.scrollTo(0, originalScrollY);

    // Notify the popup that highlighting has stopped, so it can update its UI.
    chrome.runtime.sendMessage({ action: 'highlightingStopped' });
}

// Function to highlight the next group of words.
function highlightNextGroup() {
    if (isPaused) return; // Do nothing if currently paused.

    if (currentGroupIndex < groups.length) {
        // Remove highlight from the previous group if it exists.
        if (currentGroupIndex > 0) {
            const prevGroup = groups[currentGroupIndex - 1];
            prevGroup.classList.remove('speed-reader-highlight');
            prevGroup.style.backgroundColor = ''; // Remove inline background color.
        }

        const groupToHighlight = groups[currentGroupIndex];
        groupToHighlight.classList.add('speed-reader-highlight');
        groupToHighlight.style.backgroundColor = currentHighlightColor; // Apply the user-selected color.

        // Scroll the highlighted group into view if it's not visible.
        groupToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

        currentGroupIndex++;
    } else {
        // End of text: stop highlighting and restore the document.
        clearInterval(highlightInterval);
        restoreDocument();
    }
}

// Inject CSS rules for highlighting into the document's head.
// This ensures the highlight styles are applied consistently.
const style = document.createElement('style');
style.textContent = `
    .speed-reader-highlight {
        border-radius: 3px;
        padding: 1px 2px;
        transition: background-color 0.1s ease-in-out;
    }
    .speed-reader-word-group {
        display: inline-block; /* Ensures each group behaves like a block for consistent highlighting */
    }
`;
document.head.appendChild(style);

// Listen for messages from the popup or background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'startHighlighting' || request.action === 'startPastedHighlighting') {
            // Determine if it's pasted text mode based on the action.
            const isPasted = (request.action === 'startPastedHighlighting');

            // Set current settings from the message.
            currentHighlightColor = request.color || '#add8e6';
            currentGroupSize = request.groupSize || 1;
            currentSpeed = request.speed || 300;

            // Prepare the document based on the mode (on-page or pasted text).
            prepareDocument(isPasted ? request.text : null, currentGroupSize);

            // Start the highlighting interval.
            const delay = 60000 / currentSpeed; // Calculate delay in ms per word/group.
            highlightInterval = setInterval(highlightNextGroup, delay);

        } else if (request.action === 'stopHighlighting') {
            clearInterval(highlightInterval);
            restoreDocument(); // Stop and restore for any active mode.

        } else if (request.action === 'pauseHighlighting') {
            isPaused = true;
            clearInterval(highlightInterval); // Stop the interval when paused.

        } else if (request.action === 'resumeHighlighting') {
            if (isPaused && isHighlightingActive) { // Only resume if previously paused and active.
                isPaused = false;
                // Use the stored currentSpeed for resuming.
                const resumeDelay = 60000 / currentSpeed;
                highlightInterval = setInterval(highlightNextGroup, resumeDelay);
            }
        } else if (request.action === 'toggleHighlighting') {
            // This action is triggered by the hotkey.
            // The hotkey is designed to only toggle the *on-page* reader.
            if (isHighlightingActive) { // If any highlighting is active, stop it.
                clearInterval(highlightInterval);
                restoreDocument();
            } else { // If no highlighting is active, start on-page highlighting.
                currentHighlightColor = request.color || '#add8e6';
                currentGroupSize = request.groupSize || 1;
                currentSpeed = request.speed || 300;

                prepareDocument(null, currentGroupSize); // Null indicates on-page mode.
                const delay = 60000 / currentSpeed;
                highlightInterval = setInterval(highlightNextGroup, delay);
            }
            // Notify popup to update its UI state after toggle.
            chrome.runtime.sendMessage({ action: 'hotkeyToggle', isHighlightingActive: isHighlightingActive, isPaused: isPaused });
        }
    } catch (e) {
        console.error("Error in content.js message listener:", e);
    }
});