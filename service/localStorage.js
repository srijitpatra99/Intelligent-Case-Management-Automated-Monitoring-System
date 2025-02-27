export async function saveToLocalStorage (obj) {
  let result = chrome.storage.local.set (obj);
  return result;
}

export async function getKeyFromStorage (key) {
  let result = await chrome.storage.local.get ([key]);
  return result[key];
}
