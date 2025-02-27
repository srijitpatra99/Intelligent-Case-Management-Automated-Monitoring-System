export function createBasicNotification (
  iconUrl,
  title,
  message,
  actionButtons
) {
  chrome.notifications.create ({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    buttons: actionButtons,
    priority: 0,
  });
}
