import { populateNavbarUserData } from "../utils/commonUtils.js";
import { getSalesforceAuthContext } from "../utils/auth.js";
import {
  getCaseComments,
  getPublicComments,
  getInternalComments,
  getLoggedInUserData,
} from "../service/salesforceService.js";
import { getKeyFromStorage } from "../service/localStorage.js";
import { createBasicNotification } from "../service/notificationService.js";

let sessionID;
let userID;
let dateTime;
let selectdTime;
let currTime;
let TEName;
var CaseNumbers = [];
var caseList = [];
var table;
var updateCommentStatus = {};
var TEUpdatedAt = {};
let conn;
let zone;

// Return the severity of the update from the comment body
function sevCheck(caseRecord) {
  if (
    caseRecord.includes("Warning") ||
    caseRecord.includes("WARN") ||
    caseRecord.includes("warn")
  )
    return "WARNING";
  else if (
    caseRecord.includes("Critical") ||
    caseRecord.includes("CRITICAL") ||
    caseRecord.includes("critical")
  )
    return "CRITICAL";
  else if (
    caseRecord.includes("Exhausted") ||
    caseRecord.includes("EXHAUSTED") ||
    caseRecord.includes("exhausted")
  )
    return "EXHAUSTED";
}

function getSeverity(caseRecord) {
  if (caseRecord.includes("Severity: WARNING")) return "WARNING";
  else if (caseRecord.includes("Severity: CRITICAL")) return "CRITICAL";
  else if (caseRecord.includes("Severity: EXHAUSTED")) return "EXHAUSTED";
  else if (caseRecord.includes("Severity: OKAY")) return "OKAY";
  else if (caseRecord.includes("Severity: INFORMATION")) return "INFORMATION";
  else return "Please Check Manually";
}

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
  document.getElementById("noCases").style.display = "none";
  populateNavbarUserData();
  // here we try to make connection by calling the makeConnection() method
  makeConnection();
});

async function makeConnection() {
  // we are getting the session from method getSalesforceAuthContext() which is defined in auth.js file
  let session = await getSalesforceAuthContext();
  // we get orgcs mcs session ids hence calling orgcs session id
  sessionID = session.orgcs;
  let getCases = document.getElementById("getCases");
  document.getElementById("selectTime").addEventListener("change", (event) => {
    caseList.length = 0;
    CaseNumbers.length = 0;
  });
  getKeyFromStorage("geo").then((res) => {
    if (res) {
      zone = res.toUpperCase();

      // on click of getcases button it takes the time selected in dropdown and calls getCaseComments() function
      getCases.addEventListener("click", async function () {
        if (zone) {
          document.getElementById("my-spinner").style.display = "block";
          selectdTime = document.getElementById("selectTime").value;
          if (selectdTime.length == 1) {
            var today = new Date();
            dateTime = new Date(
              today.getTime() - 1000 * 60 * 60 * selectdTime
            ).toISOString();

            let yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let curr = new Date(today.getTime()).toISOString();
            if (zone == "EMEA") {
              currTime = curr.slice(0, 11) + "07:30:00.228Z";
            } else if (zone == "AMER") {
              currTime = curr.slice(0, 11) + "15:30:00.228Z";
            } else if (zone == "APAC") {
              currTime =
                yesterday.toISOString().split("T")[0] + "T23:30:00.228Z";
            }
            console.log(dateTime);
            dateTime = dateTime > currTime ? dateTime : currTime;
            console.log(dateTime);
            displayCases();
          } else {
            createBasicNotification(
              "../views/css/slds/assets/icons/standard/insights_120.png",
              "Uh-oh",
              "please select valid time to get cases",
              []
            );
            document.getElementById("my-spinner").style.display = "none";
          }
        } else {
          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            "Uh-oh",
            "Please Update the GEO in User Settings to get Cases",
            []
          );
          document.getElementById("zone").style.display = "none";
        }
      });
    } else {
      getCases.disabled = true;
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Uh-oh",
        "Please Update the GEO in User Settings to get Cases",
        []
      );
      document.getElementById("zone").style.display = "none";
      document.getElementById("my-spinner").style.display = "none";
    }
  });
}

/* 
this getCaseComments function makes connections. Upon successfull connection
we execute the query which retrives the alerts since last n hours, the time selected in dropdown
upon every record we push them into an array and upon retriving all records we call 
displayCases(gadgetCommentRecords) function which takes the array of records stored
*/

/*
This function is called in getCaseComments() function.
this function stored the data to be displayed in the table in caseList array
and calls the displayTable function by passing the caseList array and caseNumbers array as parameters
*/
async function displayCases() {
  const userDetails = await getLoggedInUserData();
  userID = userDetails.user_id;
  const alertRecords = await getCaseComments(dateTime, userID);
  CaseNumbers = [];
  caseList = [];
  caseList.push([
    "Case Number",
    "Account Name",
    "Product Feature",
    "VSSP",
    "Severity",
    "Received at",
    "Case Updation Status",
    "Updated at",
  ]);
  let storingVisibleCaseNumbers = [];
  let visibleCaseNumbers = [];
  let storingInvisibleCaseNumbers = [];
  let invisibleCaseNumbers = [];

  alertRecords.forEach(async (element) => {
    if (
      !CaseNumbers.includes(element.Parent.CaseNumber.toString()) &&
      !element.CommentBody.includes("Severity: OK") &&
      !element.CommentBody.includes("Severity: INFO") && 
      !element.CommentBody.includes("cleared")
    ) {
      let date = new Date(element.CreatedDate);
      var finalTime = convertToIST(date);

      CaseNumbers.push(element.Parent.CaseNumber.toString());

      if (element.Parent.IsVisibleInSelfService === true) {
        if (element.Parent.Status == "New") {
          updateCommentStatus[element.Parent.CaseNumber] = "New Case";
          TEUpdatedAt[element.Parent.CaseNumber] = "-";
        } else {
          storingVisibleCaseNumbers.push(element.ParentId);
          visibleCaseNumbers.push(element.Parent.CaseNumber);
        }
      } else {
        if (element.Parent.Status == "New") {
          updateCommentStatus[element.Parent.CaseNumber] = "New Case";
          TEUpdatedAt[element.Parent.CaseNumber] = "-";
        } else {
          storingInvisibleCaseNumbers.push(element.ParentId);
          invisibleCaseNumbers.push(element.Parent.CaseNumber);
        }
      }
      var AccountName =
        element.Parent.AccountId == null ? "NA" : element.Parent.Account.Name;

      let caseSeverity = getSeverity(element.CommentBody);

      caseList.push([
        "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
          element.ParentId +
          "/view' target='_blank'>" +
          element.Parent.CaseNumber +
          "</a>",
        AccountName,
        element.Parent.FunctionalArea__c,
        element.Parent.IsVisibleInSelfService,
        caseSeverity,
        date.toLocaleDateString() + finalTime,
        "Updated",
      ]);
    }
  });

  for (let i = 0; i < storingInvisibleCaseNumbers.length; i++) {
    let invisibleCaseUpdate = await getInternalCommentDetails(
      storingInvisibleCaseNumbers[i],
      invisibleCaseNumbers[i]
    );
  }

  for (let i = 0; i < storingVisibleCaseNumbers.length; i++) {
    //console.log(element);
    console.log(currTime);
    const lastUpdate = await getPublicComments(
      currTime,
      storingVisibleCaseNumbers[i],
      userID
    );
    if (lastUpdate) {
      let publicCommentDate = new Date(lastUpdate.CreatedDate);
      TEUpdatedAt[visibleCaseNumbers[i]] =
        publicCommentDate.toLocaleDateString() +
        convertToIST(publicCommentDate);
      lastPublicComment(lastUpdate.CommentBody, visibleCaseNumbers[i]);
    } else {
      console.log("entered");
      console.log(visibleCaseNumbers[i]);
      await getInternalCommentDetails(
        storingVisibleCaseNumbers[i],
        visibleCaseNumbers[i]
      );
    }
    //console.log(updateCommentStatus[caseNo]);
  }

  //console.log(caseList);
  displayTable(caseList, CaseNumbers);
}

function lastPublicComment(publicComment, caseNum) {
  if (sevCheck(publicComment)) {
    if (
      publicComment.includes("We are investigating") ||
      publicComment.includes("We are checking") ||
      publicComment.includes("We are working")
    ) {
      updateCommentStatus[caseNum] =
        "Posted Initials -> " + sevCheck(publicComment);
    } else if (
      publicComment.includes("We will continue") ||
      publicComment.includes("between") ||
      publicComment.includes("Evaluated At") ||
      publicComment.includes("evaluated at") ||
      publicComment.includes("Next Steps: What do you need to do?")
    ) {
      updateCommentStatus[caseNum] = "Updated -> " + sevCheck(publicComment);
    }
  } else {
    updateCommentStatus[caseNum] = "Updated";
  }
}

/* 

this function is called in displayCases function
this function displays the data in caseList in the table
by creating table rows and cells

*/
async function displayTable(caseList, caseNumbers) {
  document.getElementById("clear").addEventListener("click", () => {
    document.getElementById("my-spinner").style.display = "block";

    table.innerHTML = "";

    document.getElementById("my-spinner").style.display = "none";
  });

  if (caseList.length > 1) {
    document.getElementById("clear").disabled = false;
    table = document.createElement("TABLE");
    table.setAttribute("class", "table");
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
        if (j == 3) {
          var x = document.createElement("INPUT");
          x.setAttribute("type", "checkbox");
          x.checked = caseList[i][j];
          x.disabled = true;
          cell.appendChild(x);
        } else if (j == 6) {
          cell.innerHTML = updateCommentStatus[caseNumbers[i - 1]];
        } else if (j == 7) {
          cell.innerHTML = TEUpdatedAt[caseNumbers[i - 1]];
        } else {
          cell.innerHTML = caseList[i][j];
        }
      }
    }

    document.getElementById("noCases").style.display = "none";
    document.getElementById("caseListTable").style.display = "block";
    var dvTable = document.getElementById("dvTable");
    dvTable.innerHTML = "";
    dvTable.appendChild(table);
    document.getElementById("my-spinner").style.display = "none";
  } else {
    document.getElementById("noCases").style.display = "block";
    let hr = selectdTime > 1 ? " Hours" : " Hour";
    document.getElementById("noCases").innerHTML =
      "You have no alerts Since " + selectdTime + hr;
    document.getElementById("my-spinner").style.display = "none";
  }
}

async function getInternalCommentDetails(caseId, caseNum) {
  const interalComment = await getInternalComments(currTime, caseId, userID);
  if (interalComment) {
    let publicCommentDate = new Date(interalComment.CreatedDate);
    TEUpdatedAt[caseNum] =
      publicCommentDate.toLocaleDateString() + convertToIST(publicCommentDate);
    if (sevCheck(interalComment.CommentBody)) {
      updateCommentStatus[caseNum] =
        "Updated -> " + sevCheck(interalComment.CommentBody);
    } else {
      updateCommentStatus[caseNum] = "Updated";
    }
  } else {
    TEUpdatedAt[caseNum] = "-";
    updateCommentStatus[caseNum] = "New Alert";
  }
}

function convertToIST(commentDate) {
  var hours = commentDate.getHours(); // gives the value in 24 hours format
  var AmOrPm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  var minutes = commentDate.getMinutes();
  minutes = minutes <= 9 ? "0" + minutes : minutes;
  var finalTime = " " + hours + ":" + minutes + " " + AmOrPm;
  return finalTime;
}
