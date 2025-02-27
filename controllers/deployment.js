import {
  populateNavbarUserData,
  showErrorPopup,
  convertToIST,
} from "../utils/commonUtils.js";

import {
  getCaseDetails,
  createConnection,
  getDeploymentCasesService,
  getLoggedInUserData,
  getEventsofCase,
} from "../service/salesforceService.js";
import { createBasicNotification } from "../service/notificationService.js";

let dvTable, caseNumber, accName, orgId, caseSubject, startTime, endTime, caseOwn, eventCreate,  caseId,  spinner;
// new variables
let selectCaseFilterRef, displayforCrtCaseRef, noCases ,selectViewRef, getCasesBtnRef, copyDeploymentBtnRef,selectedFilter = 'allCases',selectedView='TE';

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {

  populateNavbarUserData();

  // setting deployment record  table  null
  spinner = document.getElementById("my-spinner");
  displayforCrtCaseRef =  document.getElementById("displayforCrtCase");
  accName = document.getElementById("accountName");
  orgId = document.getElementById("orgId");
  startTime = document.getElementById("dateTimeStart");
  endTime = document.getElementById("dateTimeEnd");
  caseSubject = document.getElementById("subject");
  caseOwn = document.getElementById("ownerName");
  eventCreate = document.getElementById("createEvent");
  noCases  = document.getElementById("noCases");
  dvTable = document.getElementById("dvTable");

  // Button and select element's ref
   selectCaseFilterRef = document.getElementById("caseFilter");
	 selectViewRef = document.getElementById("selectView");
	 getCasesBtnRef = document.getElementById("getCases");
	 copyDeploymentBtnRef = document.getElementById("copyDeployment");

   setTimeout(() => {
    spinner.style.display = "none";
  }, 2000);

   noCases.style.display = "none";
   copyDeploymentBtnRef.style.visibility = "hidden";
   displayforCrtCaseRef.style.display = "none";
  
   init();
});

async function init() {


  document.getElementById("validate").addEventListener("click", async () => {
    spinner.style.display = "block";
    caseNumber = document.getElementById("case-id").value;
    const CaseDetails = await getCaseDetails(caseNumber);
    if (CaseDetails) {
      displayforCrtCaseRef.style.display = "block";
      spinner.style.display = "none";
      accName.value = CaseDetails.Parent?.Account?.Name;
      caseSubject.value = CaseDetails?.Parent?.Subject;
      orgId.value = CaseDetails.Parent?.Case_Origin_OrgID__c;
      caseOwn.value = CaseDetails.Parent?.Owner.Name;
      caseId = CaseDetails.ParentId;

      createEventonCase();
    } else {
      document.getElementById("my-spinner").style.display = "none";
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Invalid Case Number",
        "Please Enter a Valid Case Number",
        []
      );
    }
    
  });

  // select element for time frame -- @return -- 8 - default,16,24
	selectCaseFilterRef.addEventListener("change", () => {
		selectedFilter = selectCaseFilterRef.value;

		dvTable.innerHTML = "";
		noCases.style.display = "none";
    copyDeploymentBtnRef.style.visibility = "hidden";
  });

	// select element for Handover View -- @return -- TE - default , MDE
	selectViewRef.addEventListener("change", () => {
		selectedView = selectViewRef.value;

		dvTable.innerHTML = "";
		noCases.style.display = "none";
    copyDeploymentBtnRef.style.visibility = "hidden";
	});

  // will fetch additionalinformatino about provided case number
	getCasesBtnRef.addEventListener("click", async function () {
    processFetchCases()
	});

	copyDeploymentBtnRef.addEventListener("click", function () {
		copyDeploymentFun();
	});

}

async function processFetchCases(){

  spinner.style.display = "block";
  console.log(selectedFilter, selectedView)

  const u = await getLoggedInUserData();
  const q = selectedView === "TE" ? ` AND OwnerId='${u.user_id}'` : "";

  switch (selectedFilter) {
      case "allCases":
        {
          let res = await getDeploymentCasesService(q); 
          console.log(res);
          // will return all the cases related to prom except one created by gadget  
            // - Sandbox refresh monitoring, deployment monitoring, data loading, ProM on Help, 
          storeDeploymentCases(res);
        }
        break;
      case "onGoingCases":{
          DisplayDeploymentCasesInaTable("Ongoing deployment",q);
        }
        break;
      case "endedActivityCases":{
          DisplayDeploymentCasesInaTable("Deployment Ended",q);
      }
        break;
      case "noEventCases":{
        DisplayDeploymentCasesInaTable("",q);
      }
        break;
      case "reviewNeededCases":{
        //Deployment Ended
        // DisplayDeploymentCasesInaTable("Deployment Ended", q);
        DisplayDeploymentCasesInaTable("reviewNeed",q);
      }
        break;
      default: alert(selectedOption);

      spinner.style.display = "none";
  }
}

function storeDeploymentCases(casesToDisplay) {
  let dataToDisplay = [];
  dataToDisplay.push([
    "Case Number",
    "Account Name",
    "Subject",
    "Status",
    "Start Time",
    "End Time",
    "Owner",
  ]);

  if (casesToDisplay.length > 0) {

    casesToDisplay.forEach((eventCase) => {
      if (eventCase.Events) {
        let st = new Date(eventCase.Events.records[0].StartDateTime);
        let et = new Date(eventCase.Events.records[0].EndDateTime);
        
        dataToDisplay.push([
          "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
            eventCase.Id +
            "/view' target='_blank'>" +
            eventCase.CaseNumber +
            "</a>",

          eventCase.Account ? eventCase?.Account?.Name : '-', 
          eventCase.Subject,
          eventCase.Events?.records[0].Location != null  ? eventCase.Events?.records[0].Location : '-',
          st.toLocaleDateString() + convertToIST(st),
          et.toLocaleDateString() + convertToIST(et),
          eventCase.Owner?.Name,
        ]);
      } else {
        dataToDisplay.push([
          "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
            eventCase.Id +
            "/view' target='_blank'>" +
            eventCase.CaseNumber +
            "</a>",

          eventCase?.Account ? eventCase.Account?.Name : '-', 
          eventCase.Subject,
          "Event to be Created",
          "-",
          "-",
          eventCase.Owner?.Name,
        ]);
      }

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
      dvTable.innerHTML = "";
      document.getElementById("noCases").style.display = "block";
      document.getElementById("noCases").innerHTML = "No Deployment Cases for the Selected Option";

  }
}

function displayTable(casesToDisplay) {
  if (casesToDisplay.length > 1) {
    var table = document.createElement("TABLE");
    table.setAttribute("class", "table");
    table.setAttribute("id", "handover-table");
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
          }else if (casesToDisplay[i][j] == "New"){
             cell.style.color = "fuchsia";
          }
          else if (casesToDisplay[i][j] == "Deployment Ended"){
             cell.style.color = "blue";
          }
        }

        cell.innerHTML = casesToDisplay[i][j];
      }
    }

    document.getElementById("caseListTable").style.display = "block";
    dvTable.innerHTML = "";
    dvTable.appendChild(table);
    spinner.style.display = "none";
    copyDeploymentBtnRef.style.visibility = 'visible';
  }
}

function copyDeploymentFun() {
  copyDeploymentToClipboard("handover-table");

  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Success !!",
    "Copied Results to clipboard",
    [],
  );
}

async function createEventonCase() {

  eventCreate.addEventListener("click", async () => {

    if (caseSubject.value && startTime.value && endTime.value) {
      spinner.style.display = "block";
      const checkConnection = await createConnection();
      if (checkConnection) {
        let started = new Date(startTime?.value);
        let ended = new Date(endTime?.value);
        const checkIfEventCreated = await getEventsofCase(caseId);
        var x = {};
        if (checkIfEventCreated[0]?.Events) {
          x = {
            Id: checkIfEventCreated[0]?.Events?.records[0].Id,
            StartDateTime: started?.toISOString(),
            EndDateTime: ended?.toISOString(),
            Subject: subject?.value,
            WhatId: caseId,
            Location: "New",
          };
          let eventAlreadyCreated = true;
          CRUDonEvent(eventAlreadyCreated, checkConnection, x);
        } else {
          x = {
            StartDateTime: started?.toISOString(),
            EndDateTime: ended?.toISOString(),
            Subject: subject?.value,
            WhatId: caseId,
            Location: "New",
          };
          let eventAlreadyCreated = false;
          CRUDonEvent(eventAlreadyCreated, checkConnection, x);
        }

        displayforCrtCaseRef.style.display = "none";
        accName.value = "";
        orgId.value = "";
        document.getElementById("case-id").value = "";
        caseSubject.value = "";
        startTime.value = "";
        endTime.value = "";
        caseOwn.value = "";
      } else {
        spinner.style.display = "none";
        showErrorPopup(checkConnection, false);
      }
    } else {
      spinner.style.display = "none";
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Required Field missing",
        "Please provide Time frame and subject",
        []
      );
    }
  });
}

function CRUDonEvent(eventAlreadyCreated, checkConnection, x) {

    if (eventAlreadyCreated) {
      checkConnection?.sobject("Event")?.update(x, async function (err, res) {
        if (err) {
          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            "Invalid Session ID",
            "Invalid Session ID or Session expired",
            []
          );

          spinner.style.display = "none";
        } else {
          spinner.style.display = "none";
          showErrorPopup(
            "You have Successfully Created an Event on " + caseNumber,
            true
          );
          setTimeout(function () {
            location.reload();
          }, 2000);
        }
      });
    } else {
      checkConnection?.sobject("Event")?.create(x, async function (err, res) {
        if (err) {
          createBasicNotification(
            "../views/css/slds/assets/icons/standard/insights_120.png",
            "Invalid Session ID",
            "Invalid Session ID or Session expired",
            []
          );

          spinner.style.display = "none";
        } else {
          spinner.style.display = "none";
          showErrorPopup(
            "You have Successfully Created an Event on " + caseNumber,
            true
          );
          setTimeout(function () {
            location.reload();
          }, 2000);
        }
      });
    }
}

async function DisplayDeploymentCasesInaTable(statusOfCase, queryParams) {

  let specificStatusCases = [];
  let allDeploymentCases = await getDeploymentCasesService(queryParams); 

  allDeploymentCases.forEach((eventCase) => {
    if (statusOfCase != "") {
      if(statusOfCase == 'reviewNeed'){
        if( eventCase.Events &&
        (eventCase.Events.records[0].Location == 'New' ||  eventCase.Events.records[0].Location == null) ){
          specificStatusCases.push(eventCase);
        }
      }
      else if (
        eventCase.Events &&
        eventCase.Events.records[0].Location == statusOfCase
      ) {
        specificStatusCases.push(eventCase);
      }
    } else {
      if (
        eventCase.Events == null ||
        (eventCase.Events &&
          (eventCase.Events.records[0].StartDateTime == null || eventCase.Events.records[0].EndDateTime == null  ))
      ) {
        specificStatusCases.push(eventCase);
      }
    }
  });
  
  storeDeploymentCases(specificStatusCases);
}

// helper function to copy handover + formatting based on requirement
function copyDeploymentToClipboard(tableId) {
	// Get the table element
	var table = document.getElementById(tableId);
	var container = document.createElement("div");
	var selectedTable = document.createElement("table");

	for (var i = 1; i < table.rows.length; i++) {
		var clonedRow = table.rows[i].cloneNode(true); // Clone the row
		selectedTable.append(clonedRow);
	}
	const rows = selectedTable.getElementsByTagName("tr");
	const rowsArray = Array.from(rows);

	rowsArray.forEach((row) => {
		// Create a new <br> element
		const br = document.createElement("br");

		// Insert the <br> element after the current row
		row.parentNode.insertBefore(br, row.nextSibling);
	});
	console.log(selectedTable);

	container.appendChild(selectedTable);
	document.body.appendChild(container);
	
  var range = document.createRange();
	range.selectNode(container);

	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	// Copy the selected content to the clipboard
	document.execCommand("copy");

	window.getSelection().removeAllRanges();
	container.remove();

	console.log("Table copied to clipboard!");
}
