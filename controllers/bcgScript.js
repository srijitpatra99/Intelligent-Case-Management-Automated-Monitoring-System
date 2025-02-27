import { getSalesforceAuthContext } from "../utils/auth.js";
import { createBasicNotification } from "../service/notificationService.js";
import {
  saveToLocalStorage,
  getKeyFromStorage,
} from "../service/localStorage.js";
import {
  createConnection,
  fetchCustomerComment,
  fetchNewAlert,
  fetchNewCase,
  getDeploymentCasesService,
  getLoggedInUserData,
  fetchReopenedCase
} from "../service/salesforceService.js";
import { convertToIST } from "../utils/commonUtils.js";
let mde;

getKeyFromStorage("isNewCaseAlertActive").then((res) => {
  if (res) {
    getnewCaseDetails();
    getReopenedCaseDetails();
  }
});
var deploymentCases = [];
let con;

var count = 0;

var caseNumbers = {};
async function getnewCaseDetails(callback) {
  let conn = await createConnection();

  conn.identity(async function (err, res) {
    if (err) alert(err);
    var result = await fetchNewCase();
    if (result.records.length > 0) {
      countDifferent("newCase");
      var e = "";
      for (let x = 0; x < result.records.length; x++) {
        var accountName =
          result.records[x].AccountId == null
            ? "N/A"
            : result.records[x].Account.Name;
        var severity = getSeverityFromSubject(result.records[x].Subject);
        var supportArea =
          result.records[x].Account_Support_SBR_Category__c == null
            ? "N/A"
            : result.records[x].Account_Support_SBR_Category__c;
        var createdDate = new Date(result.records[x].CreatedDate);
        createdDate =
          createdDate.toLocaleDateString() + convertToIST(createdDate);

        e =
          e +
          '<div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3"><div class="card"><div id="data1" style="fontSize="12px"" class="card-header"><a target="_blank" href="https://orgcs.lightning.force.com/lightning/r/Case/' +
          result.records[x].Id +
          '/view">' +
          result.records[x].CaseNumber +
          '</a></div><div id="desc1" class="card-body text-start">' +
          "<b>Account : </b>" +
          accountName +
          "<div>" +
          "<b>Org Id : </b>" +
          result.records[x].Case_Origin_OrgID__c +
          "<div>" +
          "<b>Alert Name : </b>" +
          result.records[x].FunctionalArea__c +
          "<div>" +
          "<b>Severity : </b>" +
          severity +
          "<div>" +
          "<b>Success Plan : </b>" +
          result.records[x].SupportLevel__c +
          "<div>" +
          "<b>Support SBR Category : </b>" +
          supportArea +
          "</div></div></div></div></div></div></div></div>";

        setTimeout(() => {
          accountName =
            result.records[x].AccountId == null
              ? "N/A"
              : result.records[x].Account.Name;
          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            `🚨New Case : ${result.records[x].CaseNumber}🚨`,
            `Account : ${accountName}\nOrg Id : ${result.records[x].Case_Origin_OrgID__c}\nAlert :${result.records[x].FunctionalArea__c}`,
            []
          );
          chrome.notifications.onClicked.addListener(() => {
            chrome.tabs.create({
              url:
                "https://orgcs.lightning.force.com/lightning/r/Case/" +
                result.records[x].Id +
                "/view",
            });
          });
        }, x * 3000);
      }
      let t = document.getElementById("new-cases");
      if (e != undefined) t.innerHTML = e;
    }
  });
}

async function getReopenedCaseDetails(callback) {
  let conn = await createConnection();

  conn.identity(async function (err, res) {
    if (err) alert(err);
    var result = await fetchReopenedCase();
    if (result.length > 0) {
      countDifferent("newCase");
      var e = "";
      for (let x = 0; x < result.length; x++) {
        var accountName =
          result[x].Case.AccountId == null
            ? "N/A"
            : result[x].Case.Account.Name;
        
        var supportArea =
          result[x].Case.Account_Support_SBR_Category__c == null
            ? "N/A"
            : result[x].Case.Account_Support_SBR_Category__c;
        var createdDate = new Date(result[x].CreatedDate);
        createdDate =
          createdDate.toLocaleDateString() + convertToIST(createdDate);

        e =
          e +
          '<div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3"><div class="card"><div id="data1" style="fontSize="12px"" class="card-header"><a target="_blank" href="https://orgcs.lightning.force.com/lightning/r/Case/' +
         result[x].Case.Id +
          '/view">' +
         result[x].Case.CaseNumber +
          '</a></div><div id="desc1" class="card-body text-start">' +
          "<b>Account : </b>" +
         accountName +
          "<div>" +
          "<b>Org Id : </b>" +
          result[x].Case.Case_Origin_OrgID__c +
          "<div>" +
          "<b>Alert Name : </b>" +
          result[x].Case.FunctionalArea__c +
          "<div>" +
          "<b>Success Plan : </b>" +
          result[x].Case.SupportLevel__c +
          "<div>" +
          "<b>Support SBR Category : </b>" +
          supportArea +
          "</div></div></div></div></div></div></div></div>";

        setTimeout(() => {
          accountName =
            result[x].AccountId == null
              ? "N/A"
              : result[x].Account.Name;
          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            `🚨New Case : ${result[x].Case.CaseNumber}🚨`,
            `Account : ${accountName}\nOrg Id : ${result.Case.Case_Origin_OrgID__c}\nAlert :${result.Case.FunctionalArea__c}`,
            []
          );
          chrome.notifications.onClicked.addListener(() => {
            chrome.tabs.create({
              url:
                "https://orgcs.lightning.force.com/lightning/r/Case/" +
                result[x].Case.Id +
                "/view",
            });
          });
        }, x * 3000);
      }
      let t = document.getElementById("reopenedCases");
      if (e != undefined) t.innerHTML = e;
    }
  });
}

function getSeverityFromSubject(caseRecord) {
  if (caseRecord.includes("WARNING")) return "WARNING";
  else if (caseRecord.includes("CRITICAL")) return "CRITICAL";
  else if (caseRecord.includes("EXHAUSTED")) return "EXHAUSTED";
  else if (
    caseRecord.toUpperCase().includes("DEPLOYMENT") ||
    //caseRecord.toUpperCase().includes("MONITORING") ||
    caseRecord.toUpperCase().includes("LIVE") ||
    caseRecord.toUpperCase().includes("RELEASE")
  )
    return "DEPLOYMENT MONITORING";
  else return "N/A";
}
function getSeverity(caseRecord) {
  if (caseRecord.includes("Severity: WARNING")) return "WARNING";
  else if (caseRecord.includes("Severity: CRITICAL")) return "CRITICAL";
  else if (caseRecord.includes("Severity: EXHAUSTED")) return "EXHAUSTED";
  else if (caseRecord.includes("Severity: OKAY")) return "OKAY";
  else if (caseRecord.includes("Severity: INFORMATION")) return "INFORMATION";
  else return null;
}

 /*else if (
    caseRecord.toUpperCase().includes("DEPLOYMENT") ||
    //caseRecord.toUpperCase().includes("MONITORING") ||
    caseRecord.toUpperCase().includes("LIVE") ||
    caseRecord.toUpperCase().includes("RELEASE")
  )
    return "DEPLOYMENT MONITORING";
  else return "N/A";
} */


getKeyFromStorage("isNewCommentAlertActive").then((res) => {
  if (res) {
    getnewAlertDetails();
    getCustomerComment();
    getDeploymentCases();
  }
});

async function getnewAlertDetails(callback) {
  var today = new Date();
  let dateTime = new Date(today.getTime() - 1000 * 60 * 4.5).toISOString();
  let conn = await createConnection();
  let processedAlerts = new Set(); // Set to store processed alert IDs

  conn.identity(async function (err, res) {
    if (err) {
      return console.error("erororo---" + err);
    }
    var result = await fetchNewAlert(dateTime, res.user_id);
    if (result.records.length > 0) {
      var e = "";
      for (let x = 0; x < result.records.length; x++) {
        let alertId = result.records[x].ParentId;
        if (processedAlerts.has(alertId)) {
          continue; // Skip if this alert has already been processed
        }
        processedAlerts.add(alertId); // Add alert ID to the set

        var severity = getSeverity(result.records[x].CommentBody);
        var accountName =
          result.records[x].Parent.AccountId == null
            ? "NA"
            : result.records[x].Parent.Account.Name;

        if (
          !result.records[x].CommentBody.includes("Severity: OK") &&
          !result.records[x].CommentBody.includes("Severity: INFO")
        ) {
          countDifferent("newAlert");
          e +=
            '<div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3"><div class="card"><div id="data1" style="fontSize="10px"" class="card-header"><a target="_blank" href="https://orgcs.lightning.force.com/lightning/r/Case/' +
            result.records[x].ParentId +
            '/view">' +
            result.records[x].Parent.CaseNumber +
            '</a></div><div id="desc1" class="card-body text-start">' +
            "<b>Account : </b>" +
            accountName +
            "<div>" +
            "<b>Org Id : </b>" +
            result.records[x].Parent.Case_Origin_OrgID__c +
            "<div>" +
            "<b>Alert Name : </b>" +
            result.records[x].Parent.FunctionalArea__c +
            "<div>" +
            "<b>Severity : </b>" +
            severity +
            "</div></div></div></div></div></div>";

            setTimeout(() => {
              accountName =
                result.records[x].Parent.AccountId == null
                  ? "NA"
                  : result.records[x].Parent.Account.Name;
              severity = getSeverity(result.records[x].CommentBody);
            
              if (severity) { // Only create a notification if severity is valid
                createBasicNotification(
                  "../views/css/slds/assets/icons/standard/insights_120.png",
                  `\u{1F535}\u{1F4E2}New Alert : ${result.records[x].Parent.CaseNumber}`,
                  `Account : ${accountName}\nAlert :${result.records[x].Parent.FunctionalArea__c}\nSeverity :${severity}\nOrg Id : ${result.records[x].Parent.Case_Origin_OrgID__c}`,
                  []
                );
                chrome.notifications.onClicked.addListener(() => {
                  chrome.tabs.create({
                    url:
                      "https://orgcs.lightning.force.com/lightning/r/Case/" +
                      result.records[x].ParentId +
                      "/view",
                  });
                });
              }
            }, x * 3000);
        }
      }
      let t = document.getElementById("new-alerts");
      if (e != undefined) t.innerHTML = e;
    }
  });
}


async function getCustomerComment(callback) {
  var today = new Date();
  let dateTime = new Date(today.getTime() - 1000 * 60 * 5).toISOString();
  let conn = await createConnection();

  conn.identity(async function (err, res) {
    if (err) alert(err);
    var result = await fetchCustomerComment(dateTime, res.user_id);
    console.log(result);
    if (result && result.length > 0) {
      countDifferent("newCcomment");
      var e = "";
      for (let x = 0; x < result.length; x++) {
        var accountName =
          result[x].Parent.AccountId == null
            ? "N/A"
            : result[x].Parent.Account.Name;
        var createdDate = new Date(result[x].CreatedDate);
        createdDate =
          createdDate.toLocaleDateString() + convertToIST(createdDate);
        e =
          e +
          '<div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3"><div class="card"><div id="data1" style="fontSize="10px"" class="card-header"><a target="_blank" href="https://orgcs.lightning.force.com/lightning/r/Case/' +
          result[x].ParentId +
          '/view">' +
          result[x].Parent.CaseNumber +
          '</a></div><div id="desc1" class="card-body text-start">' +
          "<b>Account : </b>" +
          accountName +
          "<div>" +
          "<b>Org Id : </b>" +
          result[x].Parent.Case_Origin_OrgID__c +
          "<div>" +
          "<b>Alert Name : </b>" +
          result[x].Parent.FunctionalArea__c +
          "<div>" +
          "<b>Received At : </b>" +
          createdDate +
          "</div></div></div></div></div></div>";

        setTimeout(() => {
          accountName =
            result[x].Parent.AccountId == null
              ? "NA"
              : result[x].Parent.Account.Name;
          createdDate = new Date(result[x].CreatedDate);
          createdDate =
            createdDate.toLocaleDateString() + convertToIST(createdDate);

          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            `\u{1F9D1}\u200D\u2695\uFE0F New Customer Comment : ${result[x].Parent.CaseNumber}`,
            `Account : ${accountName}\nAlert :${result[x].Parent.FunctionalArea__c}\nReceived At :${createdDate}`,
            []
          );
          chrome.notifications.onClicked.addListener(() => {
            chrome.tabs.create({
              url:
                "https://orgcs.lightning.force.com/lightning/r/Case/" +
                result[x].ParentId +
                "/view",
            });
          });
        }, x * 3000);
      }

      let t = document.getElementById("new-customer-comments");
      if (e != undefined) t.innerHTML = e;
    }
  });
}

//function to send response to bcg script and play different sounds for different purposes
function countDifferent(sound) {
  count++;
  var data = "openTab";
  try {
    chrome.runtime.sendMessage(data, function (response) {
      console.log("response-----" + response);
    });
  } catch (error) {
    console.error("Error sending message:", error.message);
  }
  if (sound == "newCase") {
    let audio = new Audio("../gta_v.mp3");
    audio.play();
  } else if (sound == "newAlert") {
    let audio = new Audio("../alert.mp3");
    audio.play();
  } else {
    let audio = new Audio("../customerComment.mp3");
    audio.play();
  }

  document.getElementById("card1").style.maxWidth = "none";
  document.getElementById("card2").style.maxWidth = "none";
  document.getElementById("card3").style.maxWidth = "none";
  document.getElementById("card4").style.maxWidth = "none";
}

//will check if the countDifferent function does anything and if none,it will send response to bcgscript to close tab

setTimeout(canClose, 20000);

function canClose() {
  if (count == 0) {
    var data = "closeTab";
    chrome.runtime.sendMessage(data, function (response) {
      console.log("response-----" + response);
    });
  }
}

async function getDeploymentCases(callback) {
  con = await createConnection();
  const getDeploymentCases = await getDeploymentCasesService();

  if (getDeploymentCases) {
    storeRecordsInObject(getDeploymentCases);
  } else {
    console.log("No cases retrived");
  }
}

async function storeRecordsInObject(deploymentEventCases) {
  if (deploymentEventCases) {
    deploymentEventCases.forEach((eventCase) => {
      if (eventCase.Events) {
        if (eventCase.Events.records[0].Location != "Deployment Ended") {
          let depCase = {
            caseId: eventCase.Id,
            eventId: eventCase.Events.records[0].Id,
            caseNumber: eventCase.CaseNumber,
            accountName: eventCase.Account.Name,
            caseOwner: eventCase.OwnerId,
            status: eventCase.Events.records[0].Location,
            startDetails: new Date(eventCase.Events.records[0].StartDateTime),
            endDetails: new Date(eventCase.Events.records[0].EndDateTime),
            subject: eventCase.Events.records[0].Subject,
          };
          deploymentCases.push(depCase);
        }
      }
    });
  }
  displayDeploymentCases();
}

async function displayDeploymentCases() {
  var e = "";
  mde = await getLoggedInUserData();
  mde = mde.user_id;
  deploymentCases.forEach((eventCase) => {
    var differenceValue =
      (eventCase.startDetails.getTime() - new Date().getTime()) / 1000;
    differenceValue /= 60;
    var endTimeChecking =
      (eventCase.endDetails.getTime() - new Date().getTime()) / 1000;
    endTimeChecking /= 60;
    if (eventCase.status == "New" && Math.floor(differenceValue) <= 5) {
      if (mde == eventCase.caseOwner) {
        e =
          e +
          '<div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3"><div class="card"><div id="data1" style="fontSize="10px"" class="card-header"><a target="_blank" href="https://orgcs.lightning.force.com/lightning/r/Case/' +
          eventCase.caseId +
          '/view">' +
          eventCase.caseNumber +
          '</a></div><div id="desc1" class="card-body text-start">' +
          "<b>Account : </b>" +
          eventCase.accountName +
          "<div>" +
          "<b>Status : </b>" +
          eventCase.status +
          "<div>" +
          "<b>Start time : </b>" +
          eventCase.startDetails +
          "<div>" +
          "<b>End time : </b>" +
          eventCase.endDetails +
          "</div></div></div></div></div></div>";
      }
      var x = {
        Id: eventCase.eventId,
        Location: "Ongoing deployment",
      };
      con.sobject("Event").update(x, function (error, result) {
        if (error) {
          console.log(error);
        } else {
          console.log(result);
        }
      });
    } else if (
      eventCase.status == "Ongoing deployment" &&
      Math.floor(endTimeChecking) < 0
    ) {
      console.log(eventCase);

      var x = {
        Id: eventCase.eventId,
        Location: "Deployment Ended",
      };
      con.sobject("Event").update(x, function (error, result) {
        if (error) {
          console.log(error);
        } else {
          console.log(result);
        }
      });
    }
  });

  let t = document.getElementById("deployments");
  if (e != undefined) t.innerHTML = e;
}
