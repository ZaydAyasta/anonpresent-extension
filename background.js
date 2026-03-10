chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['globalEnabled'], (res) => {
    if (res.globalEnabled === undefined) {
      chrome.storage.local.set({ globalEnabled: false });
    }
  });
});

//TO DO: comandos pa hotkeys
chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener((cmd) => {
  // ejemplo: toggle global
  if (cmd === 'toggle-anonpresent') {
    chrome.storage.local.get(['globalEnabled'], (res) => {
      const enabled = !res.globalEnabled;
      chrome.storage.local.set({ globalEnabled: enabled }, () => {
        chrome.tabs.query({}, (tabs) => {
          for (const t of tabs) chrome.tabs.sendMessage(t.id, { action: 'global-toggle', enabled });
        });
      });
    });
  }
});