const siteToggle = document.getElementById('siteToggle');
const previewBtn = document.getElementById('previewBtn');
const optionsLink = document.getElementById('optionsLink');

function getActiveTabOrigin(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return callback(null);
    try {
      const url = new URL(tab.url);
      callback(url.origin, tab.id);
    } catch (e) {
      callback(null);
    }
  });
}

getActiveTabOrigin((origin, tabId) => {
  if (!origin) return;
  chrome.storage.local.get([`site:${origin}`], (res) => {
    const site = res[`site:${origin}`] || {};
    siteToggle.checked = !!site.enabled;
  });
});

siteToggle.addEventListener('change', () => {
  getActiveTabOrigin((origin, tabId) => {
    if (!origin) return;
    const enabled = siteToggle.checked;
    chrome.storage.local.get([`site:${origin}`], (res) => {
      const site = res[`site:${origin}`] || {};
      site.enabled = enabled;
      chrome.storage.local.set({ [`site:${origin}`]: site }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: 'toggle-site', enabled });
        });
      });
    });
  });
});

previewBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: 'revert-now' });
  });
});

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else window.open('options.html');
});