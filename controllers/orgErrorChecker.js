import {
  copyTableToClipboard,
  extractErrorCountFromComment,
  populateNavbarUserData,
} from "../utils/commonUtils.js";
import {
  fetchAlertsforVoiceCall,
  fetchOwnerInfoService,
  fetchOwnerSalesforceHelper1,
  fetchSHI,
  fetchVoiceCallData,
  fetchVoiceCallDataInLast8Hours,
  fetchNdnfInInternal,
  fetchNdnfInInternalInLast8Hours,
} from "../service/salesforceService.js";
import { createBasicNotification } from "../service/notificationService.js";

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
  document.getElementById("errorAlerts").style.display = "none";
});
document.getElementById("alertChecker-clear").addEventListener("click", () => {
  window.location.reload();
});
var zone = "";
var totalAlerts = 0;
var callsMissed = 0;
var voiceCallNotMade = [];
var voiceCallMade = [];
var caseList = [];
var voiceCallList = [];
var f = false;
var caseType = "All";
var caseTypeHTML = document.getElementById("call-select");
let endDate;
let startDate;
caseTypeHTML.addEventListener("change", function () {
  caseType = caseTypeHTML.value;
});

var orgId = "";
var alertName = "All";
document.getElementById("alert-select").addEventListener("change", () => {
  alertName = document.getElementById("alert-select").value;
});

document.getElementById("Org-id").addEventListener("change", () => {
  orgId = document.getElementById("Org-id").value;
});

var tableId = document.getElementById("orgError-checker-table");
var table = document.createElement("TABLE");
table.setAttribute("class", "table");
table.setAttribute("id", "org-error-table");
var row = table.insertRow(-1);
caseList.push([
  "Case Number",
  "Account Name",
  "Alert Name",
  "Ownership during Alert",
  "Received at",
  "Call Status",
  //"Plausible Reason",
  "NDNF",
  "Phone",
  "Error Count",
]);
for (var i = 0; i < 9; i++) {
  var headerCell = document.createElement("TH");
  headerCell.innerHTML = caseList[0][i];
  row.appendChild(headerCell);
}

document
  .getElementById("alertChecker-point")
  .addEventListener("click", orgErrorChecker);

async function orgErrorChecker(callback) {
  try {
    endDate = document.getElementById("dateTimeEnd").value;
    startDate = document.getElementById("dateTimeStart").value;
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Provide Both Start Date-time and End Date-time",
      []
    );
  }
  var selectedDateTime1 = "";
  var selectedDateTime = "";

  let currentDate = new Date(startDate);

  let currentDate1 = new Date(endDate);

  try {
    selectedDateTime = new Date(
      currentDate.setHours(currentDate.getHours())
    ).toISOString();

    selectedDateTime1 = new Date(
      currentDate1.setHours(currentDate1.getHours())
    ).toISOString();
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Provide Both Start Date-time and End Date-time",
      []
    );
  }
  clearTable();
  document.getElementById("my-spinner").style.display = "block";
  totalAlerts = 0;
  callsMissed = 0;
  voiceCallNotMade = [];
  voiceCallMade = [];
  voiceCallList = [];
  try {
    var result = await fetchAlertsforVoiceCall(
      selectedDateTime,
      selectedDateTime1,
      orgId,
      alertName
    );
    if (result.length > 0) {
      filterAlerts(result);
    } else {
      document.getElementById("my-spinner").style.display = "none";
    }
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Something went wrong : Try Providing all the Fields",
      []
    );
    document.getElementById("my-spinner").style.display = "none";
  }
}

function filterAlerts(caseComments) {
  let removingClearedAlerts = caseComments.filter(
    (comment) =>
      comment.CommentBody.includes("CRITICAL") ||
      comment.CommentBody.includes("WARNING")
  );
  processAlertsInBatches(removingClearedAlerts, 100);
}

// Why not use this method? Previously only 2000 records were considered and results in incorrect results, after modifying the code, able to get all the records but resources were insufficient to run all operations asyncly , later found workaorund by using for of loop but takes 2secs for every record, finally landed on batch processing.

// In the first scenario, the process used to run smooth for <2000 recs, took that example and processed the huge batch into smaller batches and processed each batch which resulted in quicker results

// async function voiceCallHelper(alerts) {
//   for (const alert of alerts) {
//     var errorCount = extractErrorCountFromComment(alert.CommentBody);

//     if (errorCount > 100) {
//       try {
//         totalAlerts++;
//         var originalDateTime = alert.CreatedDate;
//         var dateObj = new Date(originalDateTime);
//         dateObj.setMinutes(dateObj.getMinutes() + 25);
//         var updatedDateTime = dateObj.toISOString();
//         var dateObj1 = new Date(originalDateTime);
//         dateObj1.setMinutes(dateObj1.getMinutes() - 5);
//         var updatedDateTime1 = dateObj1.toISOString();
//         // try {
//         //   var alertOwner = await fetchOwnerSalesforceHelper1(
//         //     alert.ParentId,
//         //     updatedDateTime,
//         //     updatedDateTime1
//         //   );
//         // } catch (err) {
//         //   console.log("error in fetching owner", err);
//         // }
//         var [alertOwner, isPhonePresentInSHI, voiceCallData] =
//           await Promise.all([
//             fetchOwnerSalesforceHelper1(
//               alert.ParentId,
//               updatedDateTime,
//               updatedDateTime1
//             ),
//             fetchSHI(alert.ParentId, updatedDateTime, updatedDateTime1),
//             fetchVoiceCallData(alert),
//           ]);
//         var isPhonePresentInContactDetails = "";
//         var contactAvailable = "";
//         if (alert.Parent.ContactMobile || alert.Parent.ContactPhone) {
//           isPhonePresentInContactDetails = true;
//         } else {
//           isPhonePresentInContactDetails = false;
//         }
//         // try {
//         //   var isPhonePresentInSHI = await fetchSHI(
//         //     alert.ParentId,
//         //     updatedDateTime,
//         //     updatedDateTime1
//         //   );
//         // } catch (err) {
//         //   console.log("error in fetching SHI", err);
//         // }

//         if (isPhonePresentInSHI || isPhonePresentInContactDetails) {
//           contactAvailable = "Yes";
//         } else {
//           contactAvailable = "No";
//         }
//         var callOwnerName = "";
//         var Reason = "-";
//         /*var alertZone = null;
//         if (
//           alertZone != alert.Parent.Account.Region__c &&
//           !(alertZone == "AMER" && alert.Parent.Account.Region__c == "LACA") &&
//           !(alertZone == "EMEA" && alert.Parent.Account.Region__c == "APAC")
//           //&& !(alertZone == "APAC" && alert.Parent.Account.Region__c == "AMER")
//         ) {
//           Reason = "Diff Support Region";
//         }*/

//         try {
//           var checkCasesForNdnf = await fetchNdnfInInternal(alert);
//         } catch (err) {
//           console.log("error in fetching NDNF", err);
//         }

//         if (!checkCasesForNdnf) {
//           checkCasesForNdnf = await fetchNdnfInInternalInLast8Hours(alert);
//         }

//         // try {
//         //   var voiceCallData = await fetchVoiceCallData(alert);
//         // } catch (err) {
//         //   console.log("error in fetching Voice Call data", err);
//         // }

//         if (!voiceCallData || voiceCallData.length == 0) {
//           displayCase(
//             alert,
//             f,
//             alertOwner,
//             callOwnerName,
//             errorCount,
//             checkCasesForNdnf,
//             contactAvailable,
//             Reason,
//             true
//           );
//           voiceCallNotMade.push(alert);
//         } else {
//           let uId = voiceCallData[0].UserId;
//           let res = await fetchOwnerInfoService(uId);
//           callOwnerName =
//             res.records[0].FirstName + " " + res.records[0].LastName;
//           let d = await voiceCallData[0].CreatedDate;
//           if (caseType == "All") {
//             displayCase(
//               alert,
//               d,
//               alertOwner,
//               callOwnerName,
//               errorCount,
//               checkCasesForNdnf,
//               contactAvailable,
//               Reason,
//               true
//             );
//           } else {
//             displayCase(
//               alert,
//               d,
//               alertOwner,
//               callOwnerName,
//               errorCount,
//               checkCasesForNdnf,
//               contactAvailable,
//               false
//             );
//           }
//           voiceCallList.push(voiceCallData);
//           voiceCallMade.push(alert);
//         }
//       } catch (error) {
//         console.log("error in fetching", error, alert);
//       }
//     }
//   }

//   createBasicNotification(
//     "../views/css/slds/assets/icons/utility/success.svg",
//     "Process Complete !!",
//     "",
//     []
//   );

//   setInterval(() => {
//     document.getElementById("errorAlerts").style.display = "flex";

//     document.getElementById("totalAlerts").innerHTML = totalAlerts;
//     document.getElementById("callsMissed").innerHTML = callsMissed;
//   }, 5000);
// }

async function processAlertsInBatches(alerts, batchSize) {
  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    await processBatch(batch);
    await sleep(2000);
  }
  setInterval(() => {
    document.getElementById("errorAlerts").style.display = "flex";

    document.getElementById("totalAlerts").innerHTML = totalAlerts;
    document.getElementById("callsMissed").innerHTML = callsMissed;
  }, 5000);
  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Process Complete !!",
    "",
    []
  );
}

async function processBatch(alerts) {
  const promises = alerts.map(async (alert) => {
    try {
      const errorCount = extractErrorCountFromComment(alert.CommentBody);

      if (errorCount > 100) {
        totalAlerts++;

        var originalDateTime = alert.CreatedDate;
        var dateObj = new Date(originalDateTime);
        dateObj.setMinutes(dateObj.getMinutes() + 15);
        var updatedDateTime = dateObj.toISOString();
        var dateObj1 = new Date(originalDateTime);
        dateObj1.setMinutes(dateObj1.getMinutes() - 2);
        var updatedDateTime1 = dateObj1.toISOString();

        var [alertOwner, isPhonePresentInSHI, voiceCallData] =
          await Promise.all([
            fetchOwnerSalesforceHelper1(
              alert.ParentId,
              updatedDateTime,
              updatedDateTime1
            ),
            fetchSHI(alert.ParentId, updatedDateTime, updatedDateTime1),
            fetchVoiceCallData(alert),
          ]);
        var isPhonePresentInContactDetails = "";
        var contactAvailable = "";
        if (alert.Parent.ContactMobile || alert.Parent.ContactPhone) {
          isPhonePresentInContactDetails = true;
        } else {
          isPhonePresentInContactDetails = false;
        }

        if (isPhonePresentInSHI || isPhonePresentInContactDetails) {
          contactAvailable = "Yes";
        } else {
          contactAvailable = "No";
        }

        var callOwnerName = "";
        var Reason = "-";
        try {
          var checkCasesForNdnf = await fetchNdnfInInternal(alert);
        } catch (err) {
          console.log("error in fetching NDNF", alert, err);
        }

        if (!checkCasesForNdnf) {
          checkCasesForNdnf = await fetchNdnfInInternalInLast8Hours(alert);
        }

        if (!voiceCallData || voiceCallData.length == 0) {
          displayCase(
            alert,
            f,
            alertOwner,
            callOwnerName,
            errorCount,
            checkCasesForNdnf,
            contactAvailable,
            Reason,
            true
          );
          voiceCallNotMade.push(alert);
        } else {
          let uId = voiceCallData[0].UserId;
          try {
            var res = await fetchOwnerInfoService(uId);
          } catch (err) {
            console.log(
              "error retreiveing owner ; ",
              err,
              "alert : ",
              alert,
              "/n",
              "voice : ",
              voiceCallData
            );
          }

          callOwnerName =
            res.records[0].FirstName + " " + res.records[0].LastName;
          let d = await voiceCallData[0].CreatedDate;
          if (caseType == "All") {
            displayCase(
              alert,
              d,
              alertOwner,
              callOwnerName,
              errorCount,
              checkCasesForNdnf,
              contactAvailable,
              Reason,
              true
            );
          } else {
            displayCase(
              alert,
              d,
              alertOwner,
              callOwnerName,
              errorCount,
              checkCasesForNdnf,
              contactAvailable,
              false
            );
          }
          voiceCallList.push(voiceCallData);
          voiceCallMade.push(alert);
        }
      }
    } catch (error) {
      console.log("Error processing alert", error);
    }
  });

  await Promise.all(promises);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function displayCase(
  element,
  voiceCallMadeAtUTC,
  alertOwner,
  callOwnerName,
  errorCount,
  checkCasesForNdnf,
  contactAvailable,
  Reason,
  b
) {
  var voiceCallDateTime = "";
  var differenceTime = "";
  if (
    voiceCallMadeAtUTC.length > 5 &&
    voiceCallMadeAtUTC
    //&& alertOwner == callOwnerName
  ) {
    voiceCallDateTime = new Date(voiceCallMadeAtUTC);
    voiceCallDateTime = voiceCallDateTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  }
  var fReason = "-";
  var temp = [];
  var date = new Date(element.CreatedDate);
  differenceTime = new Date(voiceCallMadeAtUTC);
  var differenceInMinutes = Math.floor((differenceTime - date) / (1000 * 60));
  var check8 = await fetchVoiceCallDataInLast8Hours(element);
  if (
    differenceInMinutes > 0 &&
    differenceInMinutes < 30
    // &&
    // alertOwner == callOwnerName
  ) {
    differenceInMinutes = differenceInMinutes + " minutes";
    checkCasesForNdnf = "-";
  } else {
    fReason = Reason;
    if (check8) {
      voiceCallDateTime = "Call made in Last 8 Hours";
      fReason = "-";
      checkCasesForNdnf = "-";
    } else if (checkCasesForNdnf) {
      checkCasesForNdnf = "Reason Specified";
      voiceCallDateTime = "-";
      differenceInMinutes = "N/A";
    } else {
      checkCasesForNdnf = "-";
      voiceCallDateTime = "-";
      differenceInMinutes = "-";
      if (contactAvailable == "Yes") {
        callsMissed++;
        checkCasesForNdnf = "-";
        voiceCallDateTime = "No call";
        differenceInMinutes = "N/A";
      }
    }
  }

  date = date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  if (b) {
    temp.push([
      "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
        element.ParentId +
        "/view' target='_blank'>" +
        element.Parent.CaseNumber +
        "</a>",
      element.Parent.Account.Name,
      element.Parent.FunctionalArea__c,
      alertOwner,
      date,
      voiceCallDateTime,
      //fReason,
      checkCasesForNdnf,
      contactAvailable,
      errorCount,
    ]);

    for (var i = 0; i < temp.length; i++) {
      row = table.insertRow(-1);
      for (var j = 0; j < 9; j++) {
        var cell = row.insertCell(-1);

        if (j === 8) {
          if (errorCount > 500) {
            cell.innerHTML =
              '<span style="background-color: #DB1244 ;padding:2px; border-radius:4px;color:#E2E5DE">' +
              errorCount +
              "</span>";
          } else {
            cell.innerHTML = errorCount;
          }
        } else {
          cell.innerHTML = temp[i][j];
        }
      }
    }
  }

  tableId.appendChild(table);
  document.getElementById("my-spinner").style.display = "none";
}
document.getElementById("copy-data").addEventListener("click", () => {
  copyTableToClipboard("org-error-table");
  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Success !!",
    "Copied Results to clipboard",
    []
  );
});

//As discussed it doesnt matter which region

function checkForSupportRegion(alert) {
  var currentDate = new Date(alert.CreatedDate);
  var currentUTCHours = currentDate.getUTCHours();
  if (currentUTCHours >= 0 && currentUTCHours < 8) {
    zone = "APAC";
  } else if (currentUTCHours >= 8 && currentUTCHours < 16) {
    zone = "EMEA";
  } else {
    zone = "AMER";
  }
  return zone;
}

function clearTable() {
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }
}
