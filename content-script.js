(() => {
  const PHONE_REGEX = /\+?\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g;
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

  const domainKey = location.origin;

  let enabledForSite = false;
  let mutationObserver = null;
  const replacedNodes = new WeakMap();

  function isEditable(node) {
    if (!node) return false;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!el) return false;
    const tag = el.tagName;
    if (!tag) return false;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
    return el.isContentEditable === true;
  }

  function shouldSkipTextNode(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return true;
    const parent = node.parentElement;
    if (!parent) return true;
    const tag = parent.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return true;
    if (isEditable(node)) return true;
    return false;
  }

  function replaceTextInNode(node, patterns) {
    if (shouldSkipTextNode(node)) return;
    let text = node.nodeValue;
    let newText = text;

    if (patterns.phone) newText = newText.replace(PHONE_REGEX, patterns.phoneReplacement);
    if (patterns.email) newText = newText.replace(EMAIL_REGEX, patterns.emailReplacement);

    if (newText !== text) {
      const span = document.createElement('span');
      span.setAttribute('data-anon-replaced', 'true');
      span.setAttribute('data-anon-original', text);
      span.textContent = newText;
      replacedNodes.set(span, text);
      node.parentNode.replaceChild(span, node);
    }
  }

  function walkAndReplace(root, patterns) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const toProcess = [];
    while (walker.nextNode()) toProcess.push(walker.currentNode);

    toProcess.forEach(node => replaceTextInNode(node, patterns));
  }

    function revertAll() {
    const replaced = document.querySelectorAll('[data-anon-replaced]');
    replaced.forEach(el => {
      const original = el.getAttribute('data-anon-original');
      if (original !== null) {
        const textNode = document.createTextNode(original);
        el.parentNode.replaceChild(textNode, el);
      }
    });
  }

  function startObserver(patterns) {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver((mutations) => {
      const added = [];
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(n => added.push(n));
        }
        if (m.type === 'characterData') {
          added.push(m.target);
        }
      }
      for (const n of added) {
        try {
          if (n.nodeType === Node.TEXT_NODE) replaceTextInNode(n, patterns);
          else if (n.nodeType === Node.ELEMENT_NODE) walkAndReplace(n, patterns);
        } catch (e) {
          console.error('AnonPresent observer error', e);
        }
      }
    });

    mutationObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopObserver() {
    if (!mutationObserver) return;
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  function applyForSite(enabled) {
    enabledForSite = !!enabled;
    if (enabledForSite) {
      chrome.storage.local.get([`site:${domainKey}`, 'globalPatterns'], (res) => {
        const siteConfig = res[`site:${domainKey}`] || {};
        const patterns = Object.assign({
          phone: true,
          email: true,
          phoneReplacement: 'XXXXXXXX',
          emailReplacement: 'xxxxx@xxxxx'
        }, res.globalPatterns || {}, siteConfig.patterns || {});

        walkAndReplace(document.body, patterns);
        startObserver(patterns);
      });
    } else {
      stopObserver();
      revertAll();
    }
  }

  chrome.storage.local.get(['globalEnabled', `site:${domainKey}`], (res) => {
    const globalEnabled = !!res.globalEnabled;
    const siteConfig = res[`site:${domainKey}`] || {};
    const siteEnabled = !!siteConfig.enabled;

    applyForSite(globalEnabled || siteEnabled);
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === 'toggle-site') {
      chrome.storage.local.get([`site:${domainKey}`], (res) => {
        const siteConfig = res[`site:${domainKey}`] || {};
        siteConfig.enabled = !!msg.enabled;
        chrome.storage.local.set({ [`site:${domainKey}`]: siteConfig }, () => {
          applyForSite(siteConfig.enabled || false);
          sendResponse({ ok: true });
        });
      });
      return true;
    }

    if (msg.action === 'revert-now') {
      stopObserver();
      revertAll();
      sendResponse({ ok: true });
      return true;
    }
  });

})();