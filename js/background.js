function checkStatus(tabId, tab) {
  if (tab && !tab.active) {
    return;
  }
  console.log('checkStatus', tabId);

  const currentStatus = localStorage.getItem(`block_requests_${tabId}`);

  if (currentStatus === null) {
    localStorage.setItem(`block_requests_${tabId}`, false);
  }

  const listenerIsSet = chrome.webRequest.onBeforeRequest.hasListener(
    networkListener,
    {
      urls: ['<all_urls>']
    },
    ['blocking']
  );

  if (tabId !== -1) {
    if (currentStatus === 'true') {
      if (!listenerIsSet) {
        chrome.webRequest.onBeforeRequest.addListener(
          networkListener,
          {
            urls: ['<all_urls>']
          },
          ['blocking']
        );
      }

      toggleIconState(tabId, true);
    } else {
      if (listenerIsSet) {
        chrome.webRequest.onBeforeRequest.removeListener(
          networkListener,
          {
            urls: ['<all_urls>']
          },
          ['blocking']
        );
      }

      toggleIconState(tabId, false);
    }

    chrome.pageAction.show(tabId);
  }
}

function toggleIconState(tabId, state) {
  chrome.pageAction.setIcon({
    path: `img/icon64${state ? '_off' : ''}.png`,
    tabId: tabId
  });
  chrome.pageAction.setTitle({ title: `Network is ${state ? 'OFF' : 'ON'}`, tabId: tabId });
}

function saveStatus(tabId, blockStatus) {
  console.log('Setting block status to: ' + blockStatus);
  localStorage.setItem(`block_requests_${tabId}`, blockStatus);
}

function networkListener(details) {
  console.log('networkListener executed');
  // allow access to extension icons
  const extensionRoot = chrome.runtime.getURL('/');
  if (details.url.includes(extensionRoot)) {
    return { cancel: false };
  }

  const blockRequests = localStorage.getItem(`block_requests_${details.tabId}`) === 'true';
  return { cancel: blockRequests };
}

chrome.tabs.onUpdated.addListener((tabId, options, tab) => checkStatus(tabId, tab)); // args tabId, options, tab
chrome.tabs.onActivated.addListener(tab => checkStatus(tab.tabId)); // arg {tabId: 1, }

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tabId = tabs[0].id;
  console.log('INIT' + tabId);
  localStorage.clear(); // clear on init
  localStorage.setItem(`block_requests_${tabId}`, false);
  chrome.pageAction.show(tabId);
});

chrome.pageAction.onClicked.addListener(function (tab) {
  console.log(tab.id + ' : Status ');
  const blockRequests = localStorage.getItem(`block_requests_${tab.id}`) === 'true';
  const listenerIsSet = chrome.webRequest.onBeforeRequest.hasListener(
    networkListener,
    {
      urls: ['<all_urls>']
    },
    ['blocking']
  );

  if (blockRequests) {
    // network was blocked - unblocking it
    saveStatus(tab.id, false);

    if (listenerIsSet) {
      chrome.webRequest.onBeforeRequest.removeListener(
        networkListener,
        {
          urls: ['<all_urls>']
        },
        ['blocking']
      );
    }

    toggleIconState(tab.id, false);
  } else {
    // network was unblocked - blocking it
    saveStatus(tab.id, true);

    if (!listenerIsSet) {
      chrome.webRequest.onBeforeRequest.addListener(
        networkListener,
        {
          urls: ['<all_urls>']
        },
        ['blocking']
      );
    }

    toggleIconState(tab.id, true);
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  networkListener,
  {
    urls: ['<all_urls>']
  },
  ['blocking']
);
