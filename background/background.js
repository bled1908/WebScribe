// WebScribe Background Service Worker
// Routes messages between popup and content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    // Get the active tab and inject the extraction
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: 'No active tab found.' });
        return;
      }
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { type: 'DO_EXTRACT' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready yet — inject it
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ['lib/Readability.js', 'content/content.js'],
            },
            () => {
              chrome.tabs.sendMessage(tabId, { type: 'DO_EXTRACT' }, (resp) => {
                sendResponse(resp);
              });
            }
          );
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep message channel open for async response
  }
});
