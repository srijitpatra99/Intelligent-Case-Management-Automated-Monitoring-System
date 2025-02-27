import { populateNavbarUserData } from "../utils/commonUtils.js";
import { fetchAlerts } from "../service/salesforceService.js";
import { createBasicNotification } from "../service/notificationService.js";

// Dont remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
});
let endDate;
let startDate;

let getAlertsButton = document.getElementById("alertChecker-point");
getAlertsButton.addEventListener("click", function () {
  table.innerHTML = "";
  document.getElementById("my-spinner").style.display = "block";
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
    document.getElementById("my-spinner").style.display = "none";
  }
  getCommentCases();
});
let clearButton = document.getElementById("alertChecker-clear");
clearButton.addEventListener("click", () => {
  window.location.reload();
});

const table = document.getElementById("alert-checker-table");

async function getCommentCases() {
  let orgId;
  let alertName;
  let accId;
  alertName = document.getElementById("alert-select").value;
  orgId = document.getElementById("Org-id").value;
  accId = document.getElementById("account-id").value;
  let hours = 5;
  let minutes = 30;
  let currentDate = new Date(startDate);
  currentDate.setHours(currentDate.getHours() + hours);
  currentDate.setMinutes(currentDate.getMinutes() + minutes);
  let currentDate1 = new Date(endDate);
  currentDate1.setHours(currentDate1.getHours() + hours);
  currentDate1.setMinutes(currentDate1.getMinutes() + minutes);

  try {
    var selectedDateTime = new Date(
      currentDate.setHours(currentDate.getHours())
    ).toISOString();

    var selectedDateTime1 = new Date(
      currentDate1.setHours(currentDate1.getHours())
    ).toISOString();
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Provide Both Start Date-time and End Date-time",
      []
    );
    document.getElementById("my-spinner").style.display = "none";
  }
  if (selectedDateTime && selectedDateTime1) {
    if (orgId || accId) {
      let results = await fetchAlerts(
        alertName,
        accId,
        orgId,
        selectedDateTime,
        selectedDateTime1
      );
      displayCases(results);
    } else {
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Uh-oh",
        "Provide Org Id or Account Id to retrieve Alerts",
        []
      );
      document.getElementById("my-spinner").style.display = "none";
    }
  }
}

//Helper function to check severity
function getSeverity(caseRecord) {
  if (caseRecord.includes("Severity: WARNING")) return "WARNING";
  else if (caseRecord.includes("Severity: CRITICAL")) return "CRITICAL";
  else if (caseRecord.includes("Severity: EXHAUSTED")) return "EXHAUSTED";
  else if (caseRecord.includes("Severity: OKAY")) return "OKAY";
  else if (caseRecord.includes("Severity: INFORMATION")) return "INFORMATION";
  else return "N/A";
}

//Helper function to display cases
function displayCases(unfilteredCaseData) {
  var CaseNumbers = [];
  var caseList = [];

  caseList.push([
    "Case Number",
    "Account Name",
    "Org Id",
    "Alert",
    "Severity",
    "Alert Received At",
  ]);

  let alertSev = document.getElementById("alert-severity").value;

  var caseData = unfilteredCaseData.filter((alert) => {
    if (alertSev === "ALL") return unfilteredCaseData;
    return alert.CommentBody.includes("Severity: " + alertSev);
  });

  caseData.forEach((element) => {
    CaseNumbers.push(element.Parent.CaseNumber.toString());
    var sev = getSeverity(element.CommentBody);
    var createdDate = element.CreatedDate.toLocaleString()
      .toString()
      .substring(0, 19);
    createdDate = createdDate.replace("T", " ");
    createdDate = createdDate + " UTC";

    caseList.push([
      "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
        element.ParentId +
        "/view' target='_blank'>" +
        element.Parent.CaseNumber +
        "</a>",
      element.Parent.Account.Name,
      element.Parent.Case_Origin_OrgID__c,
      element.Parent.FunctionalArea__c,
      sev,
      createdDate /*,element.CreatedDate.toLocaleString().toString()*/,
    ]);
  });

  if (caseList.length > 1) {
    var table = document.createElement("TABLE");
    table.setAttribute("class", "table");
    table.innerHTML = "";
    var columnCount = caseList[0].length;

    var row = table.insertRow(-1);
    for (var i = 0; i < columnCount; i++) {
      var headerCell = document.createElement("TH");
      headerCell.innerHTML = caseList[0][i];
      row.appendChild(headerCell);
    }

    for (var i = 1; i < caseList.length; i++) {
      row = table.insertRow(-1);
      for (var j = 0; j < columnCount; j++) {
        var cell = row.insertCell(-1);
        cell.innerHTML = caseList[i][j];
      }
    }

    var tableId = document.getElementById("alert-checker-table");
    tableId.appendChild(table);

    document.getElementById("my-spinner").style.display = "none";
  } else {
    var table = document.getElementById("alert-checker-table");
    table.innerText =
      "No Specified Alerts for this Org/Account in the selected Timeframe ";
    document.getElementById("my-spinner").style.display = "none";
  }
}
