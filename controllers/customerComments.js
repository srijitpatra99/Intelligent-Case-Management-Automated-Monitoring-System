import { populateNavbarUserData } from "../utils/commonUtils.js";
import { getSalesforceAuthContext } from "../utils/auth.js";
import { createBasicNotification } from "../service/notificationService.js";
import {
  getLoggedInUserData,
  getCasesWithCustomerComments,
  getTEResponse,
} from "../service/salesforceService.js";

let sessionID;
let userID;
let dateTime;
let selectdTime;
var customerCommentTime = {};
var caseNumbers = [];
var caseList = [];
var table;
var updateCommentStatus = {};
var teUpdatedAt = {};
var slaMissedCases = {};

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
  document.getElementById("noCases").style.display = "none";
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
    caseNumbers.length = 0;
  });
  getCases.addEventListener("click", async function () {
    document.getElementById("my-spinner").style.display = "block";
    selectdTime = document.getElementById("selectTime").value;
    if (selectdTime.length <= 2) {
      var today = new Date();
      dateTime = new Date(
        today.getTime() - 1000 * 60 * 60 * selectdTime
      ).toISOString();
      displayCases();
    } else {
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Time Frame Error",
        "Please select time from the dropdown to show cases",
        []
      );
      //alert("clicked");
      document.getElementById("my-spinner").style.display = "none";
    }
  });
}

async function displayCases() {
  const userDetails = await getLoggedInUserData();
  if (userDetails) {
    userID = userDetails.user_id;
    const customerCommentRecords = await getCasesWithCustomerComments(
      dateTime,
      userID
    );

    caseNumbers = [];
    caseList = [];
    caseList.push([
      "Case Number",
      "Account Name",
      "Customer Comment",
      "Received at",
      "Status",
      "Updated at",
    ]);
    let ParentIds = [];

    if (customerCommentRecords) {
      customerCommentRecords.forEach((element) => {
        if (!caseNumbers.includes(element.Parent.CaseNumber.toString())) {
          customerCommentTime[element.Parent.CaseNumber] = element.CreatedDate;
          let date = new Date(element.CreatedDate);
          ParentIds.push(element.ParentId);
          var ISTTime = convertToIST(date);

          caseNumbers.push(element.Parent.CaseNumber.toString());

          var AccountName =
            element.Parent.AccountId == null
              ? "NA"
              : element.Parent.Account.Name;

          var customerCommentBody = element.CommentBody
            ? element.CommentBody
            : element.TextBody;

          caseList.push([
            "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
              element.ParentId +
              "/view' target='_blank'>" +
              element.Parent.CaseNumber +
              "</a>",
            AccountName,
            customerCommentBody.substring(0, 300),
            date.toLocaleDateString() + ISTTime,
            "Updated",
          ]);
        }
      });
      for (let i = 0; i < caseNumbers.length; i++) {
        const TEResponse = await getTEResponse(
          customerCommentTime[caseNumbers[i]],
          userID,
          ParentIds[i]
        );
        if (TEResponse) {
          let TECommentAt = new Date(TEResponse.CreatedDate);
          teUpdatedAt[caseNumbers[i]] =
            TECommentAt.toLocaleDateString() + convertToIST(TECommentAt);
          updateCommentStatus[caseNumbers[i]] = "Replied to Customer";
        } else {
          let currentTime = new Date();
          let timeOfCustomerComment = new Date(
            customerCommentTime[caseNumbers[i]]
          );
          var differenceValue =
            (currentTime.getTime() - timeOfCustomerComment.getTime()) / 1000;
          differenceValue /= 60;
          if (Math.abs(Math.round(differenceValue)) > 15) {
            slaMissedCases[caseNumbers[i]] = true;
          }
          updateCommentStatus[caseNumbers[i]] = "New Customer Comment";
          teUpdatedAt[caseNumbers[i]] = "-";
        }
      }
    } else {
      document.getElementById("noCases").style.display = "block";
      let hr = selectdTime > 1 ? " Hours" : " Hour";
      document.getElementById("noCases").innerHTML =
        "You have no Customer Comments Since " + selectdTime + hr;
      document.getElementById("my-spinner").style.display = "none";
    }

    displayTable(caseList);
  } else {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Session expired",
      "Current session has expired. Please refresh Orgcs",
      []
    );
  }
}

async function displayTable(caseList) {
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
        if (j == 2) {
          cell.style.width = "500px";
          cell.style.textAlign = "justify";
          cell.style.paddingRight = "30px";
          cell.innerHTML = caseList[i][j];
        } else if (j == 4) {
          if (slaMissedCases[caseNumbers[i - 1]]) cell.style.color = "red";
          cell.innerHTML = updateCommentStatus[caseNumbers[i - 1]];
        } else if (j == 5) {
          cell.innerHTML = teUpdatedAt[caseNumbers[i - 1]];
        } else cell.innerHTML = caseList[i][j];
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
      "You have no Customer Comments Since " + selectdTime + hr;
    document.getElementById("my-spinner").style.display = "none";
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
