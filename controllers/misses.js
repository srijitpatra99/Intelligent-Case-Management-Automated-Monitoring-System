import { createBasicNotification } from "../service/notificationService.js";
import {
  checkForCustomerClosed,
  checkPublicComments,
  fetchCasesforAlertsMiss,
  fetchCasesforCustomerCommentMiss,
  fetchOwnerSalesforceHelper,
  checkInternalComments,
  fetchOwnerSalesforceHelper1,
  checkFirstPublicComment,
} from "../service/salesforceService.js";
import {
  copyTableToClipboard,
  populateNavbarUserData,
} from "../utils/commonUtils.js";

document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
});
document.getElementById("misses-clear").addEventListener("click", () => {
  window.location.reload();
});

var header = [
  "Case Number",
  "Account Name",
  "Owner",
  "Received at :",
  "Last Customer Comment",
  "SLA",
  "Status",
  "EOS Status",
  "Closed",
];

var audio = new Audio("../processComplete.mp3");

function playAudio() {
  audio.play().catch((error) => {
    console.error("Error playing audio:", error);
  });
}
var tableId = document.getElementById("misses-checker-table");
var table = document.createElement("TABLE");
table.setAttribute("class", "table");
table.setAttribute("id", "misses-error-table");
var selecter = document.getElementById("misses-point");
insertHeader();
selecter.onclick = missChecker;

document.getElementById("miss-select").addEventListener("change", () => {
  clearTable();
  var type = document.getElementById("miss-select").value;

  if (type !== "alert") {
    header = [
      "Case Number",
      "Account Name",
      "Owner",
      "Received at :",
      "Last Customer Comment",
      "SLA",
      "Status",
      "EOS Status",
      "Closed",
    ];

    selecter.onclick = missChecker;
  } else {
    header = [
      "Date/Time Opened",
      "Date/Time Closed",
      "Case Number",
      "Account Name",
      "Product Feature",
      "Alert Received at:",
      "Owner",
      "Status",
      "Closed",
    ];
    selecter.onclick = alertMissChecker;
  }
});

const validUpdate = [
  "INVESTIGATION",
  "OUR DIAGNOSTIC INVESTIGATIONS",
  "HELP ARTICLE",
  "NEXT STEPS",
  "DURING THE PERIOD",
  "DURING THE EVALUATION PERIOD",
  "DURING EVALUATION PERIOD",
  "WE WILL CONTINUE TO MONITOR",
  "WE WILL MONITOR",
  "UPON CHECKING",
  "UPON FURTHER",
  "BETWEEN THE TIME PERIOD",
  "FINDINGS & DOCUMENTATION",
  "TOP",
];

const initials = [
  "WE ARE INVESTIGATING",
  "WE ARE CURRENTLY INVESTIGATING",
  "SHORTLY",
];

const blocklisted = [
  "BLOCK",
  "BLOCK LISTED",
  "BLOCKLISTED",
  "APOLOGIES",
  "KNOWN ISSUE",
  "KNOWN",
  "IGNORE",
];

const internalCommentElements = [
  "BLOCK",
  "BLOCK LISTED",
  "BLOCKLISTED",
  "KNOWN",
  "APOLOGIES",
  "KNOWN ISSUE",
  "IGNORE",
  "FALSE",
  "ENRICH",
  "NOT",
  "ENRICHED",
  "ZERO",
  "TOUCH",
  "ZERO-TOUCH",
  "LESS",
  "LOW",
];

let endDate;
let startDate;
document.getElementById("copy-data").addEventListener("click", () => {
  copyTableToClipboard("misses-error-table");
  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Success !!",
    "Copied Results to clipboard",
    []
  );
});

async function missChecker() {
  clearTable();
  insertHeader();
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
  document.getElementById("my-spinner").style.display = "block";
  try {
    var qaSelector = document.getElementById("missQA-select").value;
    var result = await fetchCasesforCustomerCommentMiss(
      selectedDateTime,
      selectedDateTime1,
      qaSelector
    );
    console.log("Query results", result);
    if (result.length > 0) {
      helperforCustomerCommentMiss(result);
      document.getElementById("my-spinner").style.display = "none";
    } else {
      document.getElementById("my-spinner").style.display = "none";
      setTimeout(() => {
        createBasicNotification(
          "../views/css/slds/assets/icons/standard/insights_120.png",
          "Uh-oh",
          "No Customer Comments in the timeframe",
          []
        );
      }, 3000);
    }
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Something went wrong : Try Again",
      []
    );
    document.getElementById("my-spinner").style.display = "none";
  }
}

async function helperforCustomerCommentMiss(customerComments) {
  for (const customerComment of customerComments) {
    try {
      const commentTime = new Date(customerComment.CreatedDate);
      var bufferTime = new Date(commentTime);
      bufferTime.setMinutes(bufferTime.getMinutes() + 120);
      var ownerTime = new Date(commentTime);
      ownerTime.setMinutes(ownerTime.getMinutes() + 2);
      var slaTime = new Date(commentTime);
      slaTime.setMinutes(slaTime.getMinutes() + 480);
      const geoTime = endGeo(commentTime);

      var [alertOwner, response, slaRecords, geoUpdate] = await Promise.all([
        fetchOwnerSalesforceHelper(
          customerComment.ParentId,
          ownerTime.toISOString()
        ),
        checkResponseToCustomer(
          customerComment.Parent.IsClosed,
          customerComment.ParentId,
          commentTime.toISOString(),
          bufferTime.toISOString()
        ),
        checkFirstPublicComment(
          customerComment.ParentId,
          commentTime.toISOString(),
          slaTime.toISOString()
        ),
        checkResponseToCustomer(
          customerComment.Parent.IsClosed,
          customerComment.ParentId,
          commentTime.toISOString(),
          geoTime
        ),
      ]);

      const istTime = commentTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      if (response != "Missed") geoUpdate = "--";

      const utcTime = commentTime.toLocaleString("en-US", { timeZone: "GMT" });
      const dateParts = utcTime.split("/");
      const finalUTCtime =
        dateParts[1] + "/" + dateParts[0] + "/" + dateParts[2];

      var slaMetTimeString =
        slaRecords && slaRecords.records.length > 0
          ? slaRecords.records[0].CreatedDate
          : "Not Met";

      var differenceInMinutes = "N/A";

      if (slaMetTimeString != "Not Met") {
        let slaMetTime = new Date(slaMetTimeString);
        differenceInMinutes = Math.floor(
          (slaMetTime - commentTime) / (1000 * 60)
        );
        differenceInMinutes = differenceInMinutes + " Minutes";
      }

      var accountName =
        customerComment.Parent.AccountId == null
          ? "N/A"
          : customerComment.Parent.Account.Name;

      var lastComment = customerComment.CommentBody
        ? customerComment.CommentBody.substring(0, 300)
        : customerComment.TextBody.substring(0, 300);

      const timeContainer = document.createElement("span");
      timeContainer.innerHTML =
        istTime +
        " IST&nbsp;&nbsp;{&nbsp<span class='small-text'>" +
        finalUTCtime +
        " UTC</span>&nbsp;}";

      const temp = [
        "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
          customerComment.ParentId +
          "/view' target='_blank'>" +
          customerComment.Parent.CaseNumber +
          "</a>",
        accountName,
        alertOwner,
        timeContainer.outerHTML,
        lastComment,
        differenceInMinutes,
        response,
        geoUpdate,
        customerComment.Parent.IsClosed,
      ];

      const row = table.insertRow(-1);
      for (let j = 0; j < 9; j++) {
        const cell = row.insertCell(j);
        cell.innerHTML = temp[j];
        if (temp[j] == "Missed") {
          cell.innerHTML =
            '<span style="background-color: #DB1244 ;padding:2px; border-radius:4px;color:#E2E5DE">' +
            temp[j] +
            "</span>";
        }
        if (temp[j] == "Requires Manual Check") {
          cell.innerHTML =
            '<span style="background-color: #AFEEEE ;padding:2px; border-radius:4px;color:#008080">' +
            temp[j] +
            "</span>";
        }
      }

      table.style.tableLayout = "fixed";
      tableId.appendChild(table);
      tableId.style.width = "100%";
      table.style.width = "100%";
    } catch (err) {
      console.error("Error processing customer comment:", err);
    }
  }
  playAudio();
  createBasicNotification(
    "../views/css/slds/assets/icons/standard/insights_120.png",
    "Process Completed",
    "",
    []
  );
}

async function alertMissChecker() {
  clearTable();
  insertHeader();
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
  document.getElementById("my-spinner").style.display = "block";
  try {
    
    var qaSelector = document.getElementById("missQA-select").value;
    var result = await fetchCasesforAlertsMiss(
      selectedDateTime,
      selectedDateTime1,
      qaSelector
    );
    console.log("Query Results", result);
    if (result.length > 0) {
      filterAlerts(result);
      document.getElementById("my-spinner").style.display = "none";
    } else {
      document.getElementById("my-spinner").style.display = "none";
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Uh-oh",
        "No Alerts in the timeframe",
        []
      );
    }
  } catch (err) {
    console.log(err);
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Something went wrong : Try Again",
      []
    );
    document.getElementById("my-spinner").style.display = "none";
  }
}

function filterAlerts(caseComments) {
  let removingClearedAlerts = caseComments.filter(
    (comment) =>
      comment.CommentBody.includes("Severity: CRITICAL") ||
      comment.CommentBody.includes("Severity: WARNING") ||
      comment.CommentBody.includes("Severity: EXHAUSTED")
  );
  processAlertsInBatches(removingClearedAlerts, 100);
}

async function processAlertsInBatches(alerts, batchSize) {
  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    await processBatch(batch);
    await sleep(2000);
  }
  // setInterval(() => {
  //   document.getElementById("errorAlerts").style.display = "flex";

  //   document.getElementById("totalAlerts").innerHTML = totalAlerts;
  //   document.getElementById("callsMissed").innerHTML = callsMissed;
  // }, 5000);
  playAudio();
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
      const alertTime = new Date(alert.CreatedDate);
      var startTime = startGeo(alertTime);
      var endTime = endGeo(alertTime);
      var severity = getSeverity(alert.CommentBody);
      var bufferTime = new Date(alertTime);
      bufferTime.setMinutes(bufferTime.getMinutes() + 120);
      var ownerTime = new Date(alertTime);
      ownerTime.setMinutes(ownerTime.getMinutes() + 17);
      var ownerTime1 = new Date(alertTime);
      ownerTime1.setMinutes(ownerTime1.getMinutes() - 2);
      var slaTime = new Date(alertTime);
      slaTime.setMinutes(slaTime.getMinutes() + 480);

      try {
        var [publicComments, alertOwner, internalComments, slaRecords] =
          await Promise.all([
            checkPublicComments(alert.ParentId, startTime, endTime),
            fetchOwnerSalesforceHelper1(
              alert.ParentId,
              ownerTime.toISOString(),
              ownerTime1.toISOString()
            ),
            checkInternalComments(alert.ParentId, startTime, endTime),
            checkFirstPublicComment(
              alert.ParentId,
              alertTime.toISOString(),
              slaTime.toISOString()
            ),
          ]);
      } catch (error) {
        console.error("An error occurred:", error);
      }

      // Aim : To find out difference in minutes from the alert time and the initial comment/update to that alert from our side
      //, but meh this doesn't work, figure out a way yourselves lads
      var slaMetTimeString =
        slaRecords && slaRecords.records.length > 0
          ? slaRecords.records[0].CreatedDate
          : "Not Met";

      var differenceInMinutes = "N/A";

      if (slaMetTimeString != "Not Met") {
        let slaMetTime = new Date(slaMetTimeString);
        differenceInMinutes = Math.floor(
          (slaMetTime - alertTime) / (1000 * 60)
        );
        differenceInMinutes = differenceInMinutes + " Minutes";
      }
      // why? find it yourself :)

      var updateStatus = "";
      if (
        publicComments &&
        publicComments.records &&
        publicComments.records.length > 0
      ) {
        let lastPublicComment = publicComments.records[0].CommentBody;
        updateStatus = await validateAlert(
          alert.ParentId,
          severity,
          lastPublicComment,
          startTime,
          endTime
        );
      } else {
        if (internalComments && internalComments.length > 0) {
          updateStatus = "Missed";
          for (const internalComment of internalComments) {
            if (
              internalCommentElements.some((u) =>
                internalComment.CommentBody.toUpperCase().includes(u)
              )
            ) {
              updateStatus = "BL/False/Enriched";
              break;
            } else if (
              validUpdate.some((v) =>
                internalComment.CommentBody.toUpperCase().includes(v)
              )
            ) {
              updateStatus = "Mailed/Missed Public Comment";
              break;
            }
          }
        } else updateStatus = "Missed";
      }

      var utcDate =
        severity +
        " at " +
        new Date(alert.CreatedDate).toISOString().split("T")[0] +
        " : " +
        new Date(alert.CreatedDate).toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour12: false,
        });
      var openDate = new Date(alert.Parent.CreatedDate);
      var utcOpenDate = openDate.toISOString();
      var utcclosedDate = alert.Parent.IsClosed
        ? new Date(alert.Parent.ClosedDate).toISOString()
        : "---";
      var accountName =
        alert.Parent.AccountId == null ? "N/A" : alert.Parent.Account.Name;

      var temp = [
        utcOpenDate,
        utcclosedDate,
        "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
          alert.ParentId +
          "/view' target='_blank'>" +
          alert.Parent.CaseNumber +
          "</a>",
        accountName,
        alert.Parent.FunctionalArea__c,
        utcDate,
        alertOwner,
        updateStatus,
        alert.Parent.IsClosed,
      ];

      const row = table.insertRow(-1);
      for (let j = 0; j < 9; j++) {
        const cell = row.insertCell(j);
        const content = temp[j];

        if (content == "Missed") {
          cell.innerHTML =
            '<span style="background-color: #DB1244 ;padding:2px; border-radius:4px;color:#E2E5DE">' +
            content +
            "</span>";
        } else if (content == "Miss / Requires Manual Check") {
          cell.innerHTML =
            '<span style="background-color: #AFEEEE ;padding:2px; border-radius:4px;color:#008080">' +
            content +
            "</span>";
        } else if (content == "Initials") {
          cell.innerHTML =
            '<span style="background-color: #36454F ;padding:2px; border-radius:4px;color:#E2E5DE">' +
            content +
            "</span>";
        } else if (content == "---") {
          cell.style.textAlign = "center";
          cell.innerHTML = "---";
        } else {
          cell.innerHTML = content;
        }
      }

      table.style.tableLayout = "fixed";
      tableId.appendChild(table);
      tableId.style.width = "100%";
      table.style.width = "100%";
    } catch (error) {
      console.log("Error processing alert", error);
    }
  });

  await Promise.all(promises);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// clearTable();

async function checkResponseToCustomer(closed, id, fromTime, endTime) {
  var updates = await checkPublicComments(id, fromTime, endTime);

  if (updates && updates.records && updates.records.length > 0) {
    let status = "";

    for (const update of updates.records) {
      if (
        !update.CommentBody.toUpperCase().includes("HI TEAM") &&
        !update.CommentBody.toUpperCase().includes("HELLO TEAM")
      ) {
        status = "Updated";
        break;
      } else {
        status = "Requires Manual Check";
      }
    }
    return status;
  } else if (closed == true) {
    var boo = await checkForCustomerClosed(id, endTime);
    if (boo) return "Customer Closed";
    else return "Missed";
  } else {
    return "Missed";
  }
}

function endGeo(dateTime) {
  var currentUTCHours = dateTime.getUTCHours();
  var endUTC = new Date(dateTime);
  if (currentUTCHours >= 0 && currentUTCHours < 8) {
    endUTC.setUTCHours(8);
    endUTC.setUTCMinutes(5);
  } else if (currentUTCHours >= 8 && currentUTCHours < 16) {
    endUTC.setUTCHours(16);
    endUTC.setUTCMinutes(5);
  } else {
    endUTC.setDate(endUTC.getDate() + 1);
    // if (currentUTCHours >= 16 && currentUTCHours <= 18) {
    //   if (currentUTCHours == 18 && currentUTCMinutes <= 29)
    //     endUTC.setDate(endUTC.getDate() + 1);
    //   else if (currentUTCHours != 18) endUTC.setDate(endUTC.getDate() + 1);
    // }
    endUTC.setUTCHours(0);
    endUTC.setUTCMinutes(5);
  }

  return endUTC.toISOString();
}

function startGeo(dateTime) {
  var currentUTCHours = dateTime.getUTCHours();
  var startUTC = new Date(dateTime);
  if (currentUTCHours >= 0 && currentUTCHours < 8) {
    startUTC.setUTCHours(0);
    startUTC.setUTCMinutes(0);
  } else if (currentUTCHours >= 8 && currentUTCHours < 16) {
    startUTC.setUTCHours(8);
    startUTC.setUTCMinutes(0);
  } else {
    startUTC.setUTCHours(16);
    startUTC.setUTCMinutes(0);
  }

  return startUTC.toISOString();
}

function getSeverity(caseRecord) {
  if (caseRecord.includes("Severity: WARNING")) return "WARNING";
  else if (caseRecord.includes("Severity: CRITICAL")) return "CRITICAL";
  else if (caseRecord.includes("Severity: EXHAUSTED")) return "EXHAUSTED";
  else return "N/A";
}

async function validateAlert(id, alertSeverity, update, fromTime, endTime) {
  var status = "Miss / Requires Manual Check";

  if (
    update.toUpperCase().includes(alertSeverity)
    //  &&
    // alertSeverity != "EXHAUSTED"
    // &&
    // !(
    //   update.includes("expected to be exhausted soon") ||
    //   update.includes("will be exhausted in")
    // )
  ) {
    // this means update is given for that alert but not sure if it is initial or full update
    status = checkInitialorUpdate(update);
  } else if (
    (alertSeverity == "CRITICAL" || alertSeverity == "WARNING") &&
    (update.toUpperCase().includes("EXHAUSTED ALERT") ||
      update.toUpperCase().includes("TOTAL USAGE HAS BEEN EXHAUSTED"))
  ) {
    status = checkInitialorUpdate(update);
  } else if (
    alertSeverity == "WARNING" &&
    (update.toUpperCase().includes("CRITICAL") ||
      update.toUpperCase().includes("CRITICAL ALERT") ||
      update.toUpperCase().includes("TOTAL USAGE HAS BEEN EXHAUSTED") ||
      update.toUpperCase().includes("EXHAUSTED ALERT"))
  ) {
    status = checkInitialorUpdate(update);
  } else {
    var updates = await checkPublicComments(id, fromTime, endTime);
    for (const element of updates.records) {
      const upperCaseCommentBody = element.CommentBody.toUpperCase().trim();
      if (
        !upperCaseCommentBody.includes("HI TEAM") &&
        !upperCaseCommentBody.includes("WHAT HAPPENED?") &&
        !upperCaseCommentBody.includes("NEXT STEPS") &&
        !upperCaseCommentBody.includes("HELLO TEAM")
      ) {
        status = "Updated for Customer Comment";
        break;
      } else if (
        upperCaseCommentBody.includes("APOLOG") ||
        upperCaseCommentBody.includes("IGNORE") ||
        upperCaseCommentBody.includes("BLOCK")
      ) {
        status = "Apology Comment";
        break;
      }
    }
  }
  return status;
}

function checkInitialorUpdate(comment) {
  if (initials.some((v) => comment.toUpperCase().includes(v))) {
    return "Initials";
  } else if (validUpdate.some((u) => comment.toUpperCase().includes(u))) {
    return "Updated";
  } else if (blocklisted.some((u) => comment.toUpperCase().includes(u))) {
    return "Apology Comment";
  } else return "Requires Manual Check";
}

function insertHeader() {
  var headerRow = table.insertRow(-1);
  for (var i = 0; i < header.length; i++) {
    var headerCell = headerRow.insertCell(i);
    headerCell.innerHTML = header[i];
    headerCell.style.fontWeight = "bold";
  }
}

function clearTable() {
  while (table.rows.length > 0) {
    table.deleteRow(0);
  }
}
