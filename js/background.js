const filter = {
  urls: ['<all_urls>']
};
const extraInfoSpec = ['blocking'];

function checkStatus(tabId, tab) {
  if (tab && !tab.active) {
    return;
  }

  console.log(`${tabId}::[checkStatus]::${tab ? 'onUpdated' : 'onActivated'}`);

  const currentStatus = localStorage.getItem(`block_requests_${tabId}`);

  if (currentStatus === null) {
    localStorage.setItem(`block_requests_${tabId}`, false);
  }

  const listenerIsSet = chrome.webRequest.onBeforeRequest.hasListener(
    networkListener,
    filter,
    extraInfoSpec
  );

  console.log(`${tabId}::[checkStatus]::[listenerIsSet: ${listenerIsSet}]`);

  if (tabId !== -1) {
    if (currentStatus === 'true') {
      if (!listenerIsSet) {
        console.log(`${tabId}::[checkStatus]::Setting listener up`);
        chrome.webRequest.onBeforeRequest.addListener(
          networkListener,
          filter,
          extraInfoSpec
        );
      }

      toggleIconState(tabId, true);
    } else {
      if (listenerIsSet) {
        console.log(`${tabId}::[checkStatus]::Removing listener`);
        chrome.webRequest.onBeforeRequest.removeListener(
          networkListener,
          filter,
          extraInfoSpec
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
  console.log(`${tabId}::[saveStatus]::[Saving status as: ${blockStatus}]`);
  localStorage.setItem(`block_requests_${tabId}`, blockStatus);
}

function networkListener(details) {
  console.log('[networkListener]::Executed');
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
  console.log(`${tabId}::[INITIALIZED]`);
  localStorage.clear(); // clear on init
  localStorage.setItem(`block_requests_${tabId}`, false);
  chrome.pageAction.show(tabId);
});

chrome.pageAction.onClicked.addListener(function (tab) {
  console.log(`${tab.id}::[pageAction.onClicked]`);
  const blockRequests = localStorage.getItem(`block_requests_${tab.id}`) === 'true';
  const listenerIsSet = chrome.webRequest.onBeforeRequest.hasListener(
    networkListener,
    filter,
    extraInfoSpec
  );

  console.log(`${tab.id}::[pageAction.onClicked]::[listenerIsSet: ${listenerIsSet}]`);

  if (blockRequests) {
    // network was blocked - unblocking it
    saveStatus(tab.id, false);

    if (listenerIsSet) {
      console.log(`${tab.id}::[pageAction.onClicked]::Removing listener`);
      chrome.webRequest.onBeforeRequest.removeListener(
        networkListener,
        filter,
        extraInfoSpec);
    }

    toggleIconState(tab.id, false);
  } else {
    // network was unblocked - blocking it
    saveStatus(tab.id, true);

    if (!listenerIsSet) {
      console.log(`${tab.id}::[pageAction.onClicked]::Setting listener up`);
      chrome.webRequest.onBeforeRequest.addListener(
        networkListener,
        filter,
        extraInfoSpec
      );
    }

    toggleIconState(tab.id, true);
  }
});
