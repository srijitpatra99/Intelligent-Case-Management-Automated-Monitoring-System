import { createBasicNotification } from "../service/notificationService.js";
import {
  fetchAlertByOwner,
  fetchClosedCases,
  fetchInternalCases,
  fetchUpdatesSendByTE,
  getCasesWithCustomerComments,
  getLoggedInUserData,
} from "../service/salesforceService.js";
import {
  getCurrentAuthContext,
  getSalesforceAuthContext,
} from "../utils/auth.js";
import {
  hideLoadingSpinner,
  populateNavbarUserData,
  showErrorPopup,
  showLoadingSpinner,
} from "../utils/commonUtils.js";
import cacheInstance from "../utils/Cache.js";
import {
  getKeyFromStorage,
  saveToLocalStorage,
} from "../service/localStorage.js";

// Creating an instance of Caching framework
// var cache = new Cache();
var homePageCardsData = {};
var loggedInUserId;
var fromTime;

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  populateCardsData();
});

async function populateCardsData() {
  showLoadingSpinner();
  const data1 = document.getElementById("data1");
  const desc1 = document.getElementById("desc1");
  const data2 = document.getElementById("data2");
  const desc2 = document.getElementById("desc2");
  const data3 = document.getElementById("data3");
  const desc3 = document.getElementById("desc3");
  const data4 = document.getElementById("data4");
  const desc4 = document.getElementById("desc4");
  const data5 = document.getElementById("data5");
  const desc5 = document.getElementById("desc5");
  const data6 = document.getElementById("data6");
  const desc6 = document.getElementById("desc6");

  // Establing auth contexts
  const currentAuthContext = await getCurrentAuthContext();
  const salesforceAuthContext = await getSalesforceAuthContext();

  // Accessing cache
  const cachedData = await getKeyFromStorage("homePageCardsDataCache");

  // populating first card
  if (cachedData && cachedData.firstCardData) {
    data1.innerText = cachedData.firstCardData.noOfAlerts;
    desc1.innerText = cachedData.firstCardData.description;
  } else {
    if (
      !salesforceAuthContext ||
      !currentAuthContext ||
      !currentAuthContext.geo
    ) {
      createBasicNotification(
        "../views/css/slds/assets/icons/utility/error.svg",
        "Error occured !!",
        "Please update your GEO & other settings by going to User Settings Tab and try again",
        []
      );
      hideLoadingSpinner();
      return;
    }

    if (currentAuthContext.geo.toLowerCase().includes("apac")) {
      fromTime = new Date();
      fromTime.setHours(5);
      fromTime.setMinutes(30);
      fromTime = fromTime.toISOString();
    } else if (currentAuthContext.geo.toLowerCase().includes("emea")) {
      fromTime = new Date();
      fromTime.setHours(13);
      fromTime.setMinutes(30);
      fromTime = fromTime.toISOString();
    } else if (currentAuthContext.geo.toLowerCase().includes("amer")) {
      let currentTime = new Date();
      fromTime = new Date();
      if (currentTime.getHours() >= 21 && currentTime.getHours() <= 23) {
        fromTime.setHours(21);
        fromTime.setMinutes(30);
        fromTime = fromTime.toISOString();
      } else if (currentTime.getHours() >= 0 && currentTime.getHours() <= 5) {
        fromTime.setDate(currentTime.getDate() - 1);
        fromTime.setHours(21);
        fromTime.setMinutes(30);
        fromTime = fromTime.toISOString();
      } else {
        fromTime = fromTime.toISOString();
      }
    }

    const loggedInUserData = await getLoggedInUserData();
    if (!loggedInUserData) {
      showErrorPopup("OrgCS session expired. Please re-login", false);
      createBasicNotification(
        "../views/css/slds/assets/icons/utility/error.svg",
        "Error occured !!",
        "OrgCS Session expired. Please re-login to OrgCS.",
        []
      );
      hideLoadingSpinner();
      return;
    }
    loggedInUserId = loggedInUserData.user_id;
    let alertReceived = await fetchAlertByOwner(
      loggedInUserId,
      fromTime,
      new Date().toISOString()
    );
    let filteredList = alertReceived.filter(
      (alert) =>
        alert.CommentBody.includes("WARNING") ||
        alert.CommentBody.includes("CRITICAL") ||
        alert.CommentBody.includes("EXHAUSTED")
    );
    if (filteredList) {
      data1.innerText = filteredList.length;
      desc1.innerText = "Total alerts received on my cases";

      // Caching the data received using our custom cache
      cacheInstance.set("firstCardData", {
        noOfAlerts: filteredList.length,
        description: "Total alerts received on my cases",
      });
      homePageCardsData["firstCardData"] = {
        noOfAlerts: filteredList.length,
        description: "Total alerts received on my cases",
      };
    }
  }

  // populating second card
  if (cachedData && cachedData.secondCardData) {
    data2.innerText = cachedData.secondCardData.updatesSent;
    desc2.innerText = cachedData.secondCardData.description2;
  } else {
    let updatesSent = await fetchUpdatesSendByTE(
      loggedInUserId,
      fromTime,
      new Date().toISOString(),
      "public"
    );
    if (updatesSent) {
      data2.innerText = updatesSent.length;
      desc2.innerText = "Public comments posted by me";
      // Caching the data received using our custom cache
      cacheInstance.set("secondCardData", {
        updatesSent: updatesSent.length,
        description2: "Public comments posted by me",
      });
      homePageCardsData.secondCardData = {
        updatesSent: updatesSent.length,
        description2: "Public comments posted by me",
      };
    }
  }

  // populating third card
  if (cachedData && cachedData.thirdCardData) {
    data3.innerText = cachedData.thirdCardData.filteredInternalComments;
    desc3.innerText = cachedData.thirdCardData.description3;
  } else {
    let internalComments = await fetchUpdatesSendByTE(
      loggedInUserId,
      fromTime,
      new Date().toISOString(),
      "internal"
    );
    let filteredInternalComments = internalComments.filter(
      (comment) => !comment.CommentBody.startsWith("Hello")
    );
    if (filteredInternalComments) {
      data3.innerText = filteredInternalComments.length;
      desc3.innerText = "Internal comments posted by me";
      // Caching the data received using our custom cache
      cacheInstance.set("thirdCardData", {
        filteredInternalComments: filteredInternalComments.length,
        description3: "Internal comments posted by me",
      });
      homePageCardsData.thirdCardData = {
        filteredInternalComments: filteredInternalComments.length,
        description3: "Internal comments posted by me",
      };
    }
  }

  // populating fourth card
  if (cachedData && cachedData.fourthCardData) {
    data4.innerText = cachedData.fourthCardData.casesClosed;
    desc4.innerText = cachedData.fourthCardData.description4;
  } else {
    let casesClosed = await fetchClosedCases(
      loggedInUserId,
      fromTime,
      new Date().toISOString()
    );
    if (casesClosed) {
      data4.innerText = casesClosed.length;
      desc4.innerText = "Cases closed by me till now";
      // Caching the data received using our custom cache
      cacheInstance.set("fourthCardData", {
        noOfAlerts: casesClosed.length,
        description: "Cases closed by me till now",
      });
      homePageCardsData.fourthCardData = {
        casesClosed: casesClosed.length,
        description4: "Cases closed by me till now",
      };
    }
  }

  // populating fifth card
  if (cachedData && cachedData.fifthCardData) {
    data5.innerText = cachedData.fifthCardData.internalCases;
    desc5.innerText = cachedData.fifthCardData.description5;
  } else {
    let internalCases = await fetchInternalCases(loggedInUserId);
    if (internalCases) {
      data5.innerText = internalCases.length;
      desc5.innerText = "Internal cases in my queue";
      // Caching the data received using our custom cache
      cacheInstance.set("fifthCardData", {
        noOfAlerts: internalCases.length,
        description: "Internal cases in my queue",
      });
      homePageCardsData.fifthCardData = {
        internalCases: internalCases.length,
        description5: "Internal cases in my queue",
      };
    }
  }

  // populating sixth card
  if (cachedData && cachedData.sixthCardData) {
    data6.innerText = cachedData.sixthCardData.customerCommentCases;
    desc6.innerText = cachedData.sixthCardData.description6;
  } else {
    let customerCommentCases = await getCasesWithCustomerComments(
      fromTime,
      loggedInUserId
    );
    if (customerCommentCases) {
      data6.innerText = customerCommentCases.length;
      desc6.innerText = "Customer Comments received today";
    }
    // Caching the data received using our custom cache
    cacheInstance.set("sixthCardData", {
      noOfAlerts: customerCommentCases.length,
      description: "Customer Comments received today",
    });
    homePageCardsData.sixthCardData = {
      customerCommentCases: customerCommentCases.length,
      description6: "Customer Comments received today",
    };
  }

  // Saving all cards data to cache
  if (homePageCardsData) {
    const res = await saveToLocalStorage({
      homePageCardsDataCache: homePageCardsData,
    });
  }

  hideLoadingSpinner();
}
