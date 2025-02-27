import {
  populateNavbarUserData,
  showErrorPopup,
  convertToIST,
  //copyTableToClipboard,
} from "../utils/commonUtils.js";

import {
  fetchCombinedCaseDetails,
  checkDeploymentPublicComments,
  createConnection,
  fetchUsersByGEO,
  checkDeploymentInternalComments,
} from "../service/salesforceService.js";
import { createBasicNotification } from "../service/notificationService.js";
import Logger from "../utils/Logger.js";
import { getCurrentAuthContext } from "../utils/auth.js";
import {
  MANAGER_EMAIL_IDS,
  PROQA_PROCESS_NAME,
  QA_TEAM_EMAIL_IDS,
} from "../utils/constants.js";

var dvTable;
let accName;
let orgId;
let caseSubject;
let startDate;
let endDate;
let caseOwn;
let eventCreate;
var errorMessage;
var closeErrorButton;
let deployCasesBtn;
let spinner;
var table = document.createElement("TABLE");
var selectedDateTime1 = "";
var selectedDateTime = "";
let finaldata = [];

  // Please remember to import this js as a module in corresponding html file
  document.addEventListener("DOMContentLoaded", function () {
    populateNavbarUserData();
    spinner = document.getElementById("my-spinner");
    setTimeout(() => {
      spinner.style.display = "none";
    }, 2000);
    document.getElementById("copy-data1").addEventListener("click", copyTableToClipboard);
  });

let currentAuthContext;
const nonManagerViewSection = document.getElementById("nonmgrteamview");
const managerViewSection = document.getElementById("managerView");
getCurrentAuthContext().then((result) => {
  Logger.logEvent(PROQA_PROCESS_NAME, "Authorizing...");
  currentAuthContext = result;
  if (currentAuthContext != null) {
    let role = currentAuthContext.role;
    let emailId = currentAuthContext.email;
    managerViewSection.style.display = "none";
    nonManagerViewSection.style.display = "block";
    if (role == "Manager" && MANAGER_EMAIL_IDS.includes(emailId)) {
      nonManagerViewSection.style.display = "none";
      managerViewSection.style.display = "block";
    }
    else{
      nonManagerViewSection.style.display = "block";
      managerViewSection.style.display = "none";
    }
  }
  Logger.logEvent(PROQA_PROCESS_NAME, "Authorization successfull");
});

  
  document
  .getElementById("misses-point")
  .addEventListener("click", deploymentPCChecker);

async function deploymentPCChecker() {
  try {
    endDate = document.getElementById("dateTimeEnd1").value;
    startDate = document.getElementById("dateTimeStart1").value;
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Provide Both Start Date-time and End Date-time",
      []
    );
  }

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
    var result1 = await fetchCombinedCaseDetails(selectedDateTime,selectedDateTime1);
   //console.log(result1);
    if (result1.length > 0) {
      const newResult1 = result1.filter(caseRecord => {
        return caseRecord.Events && caseRecord.Events.records && caseRecord.Events.records.length > 0;
    });
     console.log(newResult1);
     processAlertsInBatches(newResult1, 100);
  
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

async function processAlertsInBatches(alerts, batchSize) {
  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    await processStep(batch);
    await sleep(2000);
  }
}

async function processStep(cases) {
  try {
      let storedRecords = []; // Move the declaration here, accessible to all parts of the function

      await Promise.all(cases.map(async (caseBonk) => {
          for (let i = 0; i < caseBonk.caseHistory.length; i++) {
              const alertTime = new Date(caseBonk.caseHistory[i].CreatedDate);
              var startTime = startGeo(alertTime);
              let startTime1 = new Date(startTime);
              let { formattedDate, dateHoursMinutes } = formatDateToCreatedDate(startTime1);
              var endTime = endGeo(alertTime);
              let endTime1 = new Date(endTime);
              var ID = caseBonk.Id;
              var caseNum = caseBonk.CaseNumber;
              let eventST = new Date(caseBonk.Events.records[0].StartDateTime);
              let eventET = new Date(caseBonk.Events.records[0].EndDateTime);
              let dateObject = new Date(eventET);
              dateObject.setDate(dateObject.getDate() + 1);
              let newEndTime = dateObject;
              let eventET1 = eventET.toLocaleDateString() + convertToIST(eventET);
              let eventST1 = eventST.toLocaleDateString() + convertToIST(eventST);
              let geostartTime = dateHoursMinutes;
              var ownerName1 = caseBonk.caseHistory[i].NewValue;
              var accountName = caseBonk.Account.Name;
              var sub = caseBonk.Subject;

              try {
                  var updates = await checkDeploymentPublicComments(ID, startTime, endTime);
                  if (updates.records.length == 0 && startTime1 > eventST && endTime1 < newEndTime && startTime1 < alertTime && ownerName1 != "Working in Org62") {
                   // console.log(updates);
                    var newUpdates = await checkDeploymentInternalComments(ID, startTime, endTime);
                   // console.log(newUpdates);
                    if (newUpdates.records.length == 0) {
                      let desiredData = { ID,caseNum,accountName,sub,eventST1,eventET1,ownerName1,geostartTime};
                      console.log("Created Date = "+alertTime+"startGeoTime = "+startTime+"  Event  start Time = "+eventST+"StartDateTime1 = "+selectedDateTime1+"startTime1 = "+startTime1+"formatted Date = "+formattedDate+"EndTime1 = "+endTime1);
                      storedRecords.push(desiredData);
                      
                    }
                  }

              } catch (error) {
                  console.error("An error occurred:", error);
              }
          }
      }));
      finaldata = storedRecords;
      
      

  } catch (error) {
      console.log("Error processing alert", error);
  }
  storeDeploymentCases(finaldata);
}

async function storeDeploymentCases(casesToDisplay) {
  let dataToDisplay = [];
  dataToDisplay.push([
    "Case Number",
    "Account Name",
    "Subject",
   //"Status",
    "Event Start Time",
    "Event End Time",
    "Owner",
    "Geo Start Time"
  ]);
  
  console.log(casesToDisplay);
  if (casesToDisplay.length > 0) {
    casesToDisplay.forEach((eventCase) => {
        dataToDisplay.push([
          "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
            eventCase.ID +
            "/view' target='_blank'>" +
            eventCase.caseNum +
            "</a>",

          eventCase.accountName,
          eventCase.sub,
         //eventCase.Events.records[0].Location,
          eventCase.eventST1,
          eventCase.eventET1,
          eventCase.ownerName1,
          eventCase.geostartTime,

        ]);
    });
    
    displayTable(dataToDisplay);
  } else {
    spinner.style.display = "none";

    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "No Deployment Cases for the Selected Option",
      "",
      []
    );
    try{
      dvTable.innerHTML = "";
      document.getElementById("noCases").style.display = "block";
      document.getElementById("noCases").innerHTML =
        "No Deployment Cases for the Selected Option";

    }catch(error){
      console.error("An error occurred:", error);

    }
  }
}


function endGeo(dateTime) {
  var currentUTCHours = dateTime.getUTCHours();
  var endUTC = new Date(dateTime);
  if (currentUTCHours >= 0 && currentUTCHours < 8) {
    endUTC.setUTCHours(8);
    endUTC.setUTCMinutes(10);
  } else if (currentUTCHours >= 8 && currentUTCHours < 16) {
    endUTC.setUTCHours(16);
    endUTC.setUTCMinutes(10);
  } else {
    endUTC.setDate(endUTC.getDate() + 1);
    endUTC.setUTCHours(0);
    endUTC.setUTCMinutes(10);
  }

  return endUTC.toISOString();
}

function startGeo(dateTime) {
  var currentUTCHours = dateTime.getUTCHours();
  var startUTC = new Date(dateTime);
  if (currentUTCHours >= 0 && currentUTCHours < 8) {
    startUTC.setUTCHours(0);
    startUTC.setUTCMinutes(5);
  } else if (currentUTCHours >= 8 && currentUTCHours < 16) {
    startUTC.setUTCHours(8);
    startUTC.setUTCMinutes(5);
  } else {
    startUTC.setUTCHours(16);
    startUTC.setUTCMinutes(5);
  }

  return startUTC.toISOString();
}


async function copyTableToClipboard() {
  try {
    // Get the table data as text
    let tableHtml = dvTable.innerText; // Use innerText to get text content instead of HTML

    // Use the Clipboard API to write the text to the clipboard
    await navigator.clipboard.writeText(tableHtml);

    // Notify the user that the data has been copied
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Success",
      "Data copied to clipboard!",
      []
    );
  } catch (err) {
    createBasicNotification(
      "../views/css/slds/assets/icons/standard/insights_120.png",
      "Uh-oh",
      "Failed to copy data to clipboard",
      []
    );
  }
}


function displayTable(casesToDisplay) {
  if (casesToDisplay.length > 1) {
    var table = document.createElement("TABLE");
    table.setAttribute("class", "table");
    var columnCount = casesToDisplay[0].length;

    var row = table.insertRow(-1);
    for (var i = 0; i < columnCount; i++) {
      var headerCell = document.createElement("TH");
      headerCell.innerHTML = casesToDisplay[0][i];
      row.appendChild(headerCell);
    }

    for (var i = 1; i < casesToDisplay.length; i++) {
      row = table.insertRow(-1);
      for (var j = 0; j < columnCount; j++) {
        var cell = row.insertCell(-1);
        if (j == 3) {
          if (casesToDisplay[i][j] == "Event to be Created") {
            cell.style.color = "red";
          } else if (casesToDisplay[i][j] == "Ongoing deployment") {
            cell.style.color = "green";
          }
        }

        cell.innerHTML = casesToDisplay[i][j];
      }
    }

    document.getElementById("caseListTable").style.display = "block";
    dvTable = document.getElementById("dvTable");
    dvTable.innerHTML = "";
    dvTable.appendChild(table);
    spinner.style.display = "none";
  }
}

document.getElementById("misses-clear").addEventListener("click", () => {
  window.location.reload();
});

function formatDateToCreatedDate(date) {
  if (!(date instanceof Date)) {
      throw new TypeError("Invalid input: expected a Date object.");
  }

  // Get individual components
  let dayOfWeek = date.toLocaleString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
  let month = (date.getMonth() + 1).toString().padStart(2, '0');
  let day = date.toLocaleString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
  let year = date.getFullYear();

  // Convert hours to 12-hour format with AM/PM
  let hours = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).split(':')[0];
  let minutes = date.getMinutes().toString().padStart(2, '0');
  let ampm = date.toLocaleString('en-US', { hour: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).split(' ')[1];

  // Timezone offset
  let timezoneOffset = -date.getTimezoneOffset(); // in minutes
  let sign = timezoneOffset >= 0 ? '+' : '-';
  timezoneOffset = Math.abs(timezoneOffset);
  let offsetHours = Math.floor(timezoneOffset / 60).toString().padStart(2, '0');
  let offsetMinutes = (timezoneOffset % 60).toString().padStart(2, '0');

  // Create a new variable to store date, hours, and minutes in AM/PM format
  let dateHoursMinutes = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

  // Combine components to form the desired format
  let formattedDate = `${dayOfWeek} ${month} ${day} ${year} ${hours}:${minutes}:${date.getSeconds().toString().padStart(2, '0')} GMT${sign}${offsetHours}${offsetMinutes} (India Standard Time)`;

  // Return both the formatted date and the new variable
  return { formattedDate, dateHoursMinutes };
}



