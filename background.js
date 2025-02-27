chrome.action.onClicked.addListener(async (info, tab) => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("/views/popup.html") });
});

chrome.alarms.create("In Background Script", { periodInMinutes: 2 });
let tabId;
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(alarm);
  chrome.tabs.create(
    { active: false, url: chrome.runtime.getURL("/views/bcgPage.html") },
    function (tab) {
      tabId = tab.id;
    }
  );
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request == "closeTab") {
    chrome.tabs.remove(tabId, function () {});
    sendResponse("tab closed");
  }

  if (request == "openTab") {
    chrome.tabs.update(tabId, { active: true });
    sendResponse("tab open");
  }
});

// Invalidating cache
function removeItemsFromLocalStorage() {
  chrome.storage.local.remove(["homePageCardsDataCache"], function () {
    console.log("Removed cached card data from local storage.");
  });
}

// Set the interval for cache invalidation at every 15 minutes
setInterval(removeItemsFromLocalStorage, 15 * 60 * 1000);
