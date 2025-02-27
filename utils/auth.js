import {
  saveToLocalStorage,
  getKeyFromStorage,
} from "../service/localStorage.js";

import {
  ORGCS_DOMAIN_NAME,
  MCS_DOMAIN_NAME,
  GUS_DOMAIN_NAME,
} from "./constants.js";

export async function getCurrentAuthContext() {
  if (
    getKeyFromStorage("name") != null &&
    getKeyFromStorage("email") != null &&
    getKeyFromStorage("geo") != null &&
    getKeyFromStorage("role") != null &&
    getKeyFromStorage("teamChannel") != null &&
    getKeyFromStorage("isNewCaseAlertActive") != null &&
    getKeyFromStorage("isNewCommentAlertActive") != null
  ) {
    let currentAuthContext = {};

    currentAuthContext.name = await getKeyFromStorage("name");
    currentAuthContext.email = await getKeyFromStorage("email");
    currentAuthContext.geo = await getKeyFromStorage("geo");
    currentAuthContext.role = await getKeyFromStorage("role");
    currentAuthContext.teamChannel = await getKeyFromStorage("teamChannel");
    currentAuthContext.isNewCaseAlertActive = await getKeyFromStorage(
      "isNewCaseAlertActive"
    );
    currentAuthContext.isNewCommentAlertActive = await getKeyFromStorage(
      "isNewCommentAlertActive"
    );

    return currentAuthContext;
  }
  return null;
}

export async function getSalesforceAuthContext() {
  let orgcs_session_id;
  let mcs_session_id;
  let gus_session_id;

  orgcs_session_id = await getCookies(ORGCS_DOMAIN_NAME, "sid");
  mcs_session_id = await getCookies(MCS_DOMAIN_NAME, "sid");
  gus_session_id = await getCookies(GUS_DOMAIN_NAME, "sid");

  let session = {
    orgcs: orgcs_session_id,
    mcs: mcs_session_id,
    gus: gus_session_id,
  };

  return session;
}

async function getCookies(domain, name) {
  let cookie = await chrome.cookies.get({
    url: domain,
    name: name,
  });
  if (cookie != null) {
    return cookie.value;
  } else {
    return "";
  }
}
