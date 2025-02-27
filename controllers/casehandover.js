// Import required JS to current Path

import {
	populateNavbarUserData,
	showErrorPopup,
} from "../utils/commonUtils.js";
import { createBasicNotification } from "../service/notificationService.js";
import {
	createConnection,
	getCaseDetails,
	getLoggedInUserData,
	getCasesWithHandover,
} from "../service/salesforceService.js";

// need to review
let selectedTime = "8";
let selectedView = "TE";
let selectedReason = "Bandwidth Issue";
var caseNumbers = []; // commented out because
var caseList = [];
var table;
var copyHandoverBtnRef;
var CaseDetailWrapperRef;
var currCaseParentId = "";

var spinnerRef;

// additional case details files reference

var AccNameInputRef;
var OrgIdInputRef;
var PfInputRef;
var CaseOwnerInputRef;
var CaseSubjectInputRef;
var HandoverInputRef;
var caseNumberInputRef;

//DOM ContentLoad which will run at first once the html content is loaded
document.addEventListener("DOMContentLoaded", function () {
	spinnerRef = document.getElementById("my-spinner");
	copyHandoverBtnRef = document.querySelector("#copyHandover");
	CaseDetailWrapperRef = document.querySelector("#CaseDetailWrapper");

	spinnerRef.style.display = "block";
	copyHandoverBtnRef.style.display = "none";
	CaseDetailWrapperRef.style.display = "none";

	populateNavbarUserData();
	initFuncations();

	AccNameInputRef = document.getElementById("accountName");
	OrgIdInputRef = document.getElementById("orgId");
	PfInputRef = document.getElementById("PF");
	CaseOwnerInputRef = document.getElementById("caseOwner");
	CaseSubjectInputRef = document.getElementById("subject");
	HandoverInputRef = document.getElementById("HandoverComment");

	spinnerRef.style.display = "none";
});

// Helper functions
async function initFuncations() {
	let selectHandoverTimeRef = document.getElementById("selectHandoverTime");
	let selectHandoverViewRef = document.getElementById("selectHandoverView");
	let selectReasonRef = document.getElementById("reason");
	let getCaseDetailBtnRef = document.getElementById("getCaseDetail");
	let clearBtnRef = document.getElementById("clear");
	let getHandoverBtnRef = document.getElementById("getHandoverBtn");
	let postCommentBtnRef = document.getElementById("postComment");
	caseNumberInputRef = document.getElementById("caseNumber");

	var dvTable = document.getElementById("dvTable");
	var noCases = document.getElementById("noCases");

	// select element for time frame -- @return -- 8 - default,16,24
	selectHandoverTimeRef.addEventListener("change", () => {
		selectedTime = selectHandoverTimeRef.value;
		dvTable.innerHTML = "";
		copyHandoverBtnRef.style.display = "none";
		noCases.style.display = "none";
	});

	// select element for Handover View -- @return -- TE - default , MDE
	selectHandoverViewRef.addEventListener("change", () => {
		selectedView = selectHandoverViewRef.value;
		dvTable.innerHTML = "";
		copyHandoverBtnRef.style.display = "none";
		noCases.style.display = "none";
	});

	// select element for Reason  -- @return -- "Bandwidth Issue" - default , "Internal Tool Failure / Lag", "Action should be performed during the next shift"
	selectReasonRef.addEventListener("change", () => {
		selectedReason = selectReasonRef.value;
	});

	// will fetch additionalinformatino about provided case number
	getCaseDetailBtnRef.addEventListener("click", function () {
		spinnerRef.style.display = "block";
		HandleGetCaseDetailAction();
	});

	// will fetch additionalinformatino about provided case number
	clearBtnRef.addEventListener("click", function () {
		clearHandoverInputs();
	});

	postCommentBtnRef.addEventListener("click", function () {
		spinnerRef.style.display = "block";
		HandlePostHandoverAction();
	});

	// get cases button after select element
	getHandoverBtnRef.addEventListener("click", function () {
		spinnerRef.style.display = "block";
		displayCases();
		//clearHandoverInputs();
	});

	copyHandoverBtnRef.addEventListener("click", () => {
		copyHandoverToClipboard("handover-table");
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/success.svg",
			"Success !!",
			"Copied Results to clipboard",
			[],
		);
	});
}

// helper function to get additional information of the case from case number
async function HandleGetCaseDetailAction() {
	let selectedCaseNumber = caseNumberInputRef.value?.trim();
	const CaseDetails = await getCaseDetails(selectedCaseNumber);

	if (CaseDetails) {
		AccNameInputRef.value = CaseDetails.Parent?.Account?.Name;
		OrgIdInputRef.value = CaseDetails?.Parent?.Case_Origin_OrgID__c;
		PfInputRef.value = CaseDetails?.Parent?.FunctionalArea__c;
		CaseOwnerInputRef.value = CaseDetails?.Parent?.Owner?.Name;
		CaseSubjectInputRef.value = CaseDetails?.Parent?.Subject;

		HandoverInputRef.value = "";
		CaseDetailWrapperRef.style.display = "block";
		currCaseParentId = CaseDetails.ParentId;
		caseNumberInputRef.disabled = true;
	} else {
		console.log("No Case Details");
		alert(selectedCaseNumber + " is not a valid case number");
		clearHandoverInputs();
	}
	console.log({ selectedCaseNumber, currCaseParentId });

	spinnerRef.style.display = "none";
}

function clearHandoverInputs() {
	caseNumberInputRef.value = "";
	caseNumberInputRef.disabled = false;

	AccNameInputRef.value = "";
	OrgIdInputRef.value = "";
	PfInputRef.value = "";
	CaseOwnerInputRef.value = "";
	CaseSubjectInputRef.value = "";
	HandoverInputRef.value = "";
	currCaseParentId = "";

	// hiding layout
	CaseDetailWrapperRef.style.display = "none";

	console.log("clear fun stuff");
	console.log({ currCaseParentId });
}

// helper function for Posting the handover message on the case
async function HandlePostHandoverAction() {
	let handoverComment = genrateHanodverTemplet();

	if (!handoverComment || !currCaseParentId) {
		console.log("No vaild inputs");
		return;
	}

	console.log(currCaseParentId);
	console.log(handoverComment);

	let response = await postInternalCommentOnCase(
		currCaseParentId,
		handoverComment,
	);
	console.log({ response });

	spinnerRef.style.display = "none";
}

function genrateHanodverTemplet() {
	const templateHeader =
		"=========== INTERNAL_PROM_GEO_HANDOVER ============\n";
	//const promkey = "Proactive Monitoring Global Handover\n\n";
	let handoverComment = HandoverInputRef.value;
	let handoverReason = HandoverInputRef.value;
	let finalInternalComment = "";
	let currGeo = document.getElementById("current-shift").innerText;
	let nextgeo =
		currGeo === "AMER"
			? "APAC"
			: currGeo === "APAC"
			? "EMEA"
			: currGeo === "EMEA"
			? "AMER"
			: "APAC";

	finalInternalComment +=
		templateHeader +
		"From GEO: " +
		currGeo +
		"\n" +
		"To GEO: " +
		nextgeo +
		"\n" +
		"Reason: " +
		selectedReason +
		"\n\n" +
		"Action Item for next GEO: " +
		"\n" +
		handoverComment;

	// const temp1 = `${templateHeader}${promkey}From GEO: ${currGeo}\nTo GEO: ${nextgeo}\n${handoverComment}`;

	return finalInternalComment?.trim();
}

// extended helper function for  HandlePostHandoverAction -- only for api call
async function postInternalCommentOnCase(caseNumber, finalInternalComment) {
	let conn = await createConnection();
	conn.sobject("CaseComment").create(
		{
			ParentId: caseNumber,
			CommentBody: finalInternalComment,
			IsPublished: false,
		},
		(err, res) => {
			if (err) {
				showErrorPopup(
					"Case updation failed, Please check logs ",
					false,
				);
				return console.error(err);
			}
			showErrorPopup("Case updated successfully !! ", true);
			console.log(res);
			return res;
		},
	);
}

// helper function to generate array containing case information
async function displayCases() {
	const userDetails = await getLoggedInUserData();

	if (userDetails) {
		// reseting values
		caseList = [];

		let queryParam = createQueryParamWih(
			selectedTime,
			selectedView,
			userDetails.user_id,
		);

		const caseRecArr = await getCasesWithHandover(queryParam);

		caseList.push([
			"Case Number",
			"Account Name",
			"Product Feature",
			"Posted At",
			"Message",
			"Case Owner",
		]);

		if (caseRecArr) {
			caseRecArr.forEach((element) => {
				// if (
				// 	!caseNumbers.includes(element.Parent.CaseNumber.toString())
				// ) {

				//caseNumbers.push(element.Parent.CaseNumber.toString());

				let AccountName =
					element?.Parent?.Account?.Name == null
						? "NA"
						: element?.Parent?.Account?.Name;

				let PnF =
					element?.Parent?.FunctionalArea__c == null
						? "NA"
						: element?.Parent?.FunctionalArea__c;

				let commentBody = extractOnlyActionItemFromComment(
					element?.CommentBody
						? element?.CommentBody
						: element?.TextBody,
				);

				let finalMessage =
					commentBody.length > 501
						? commentBody.substring(0, 500) + " ..... "
						: commentBody;

				let date = new Date(element?.CreatedDate);
				let ISTTime = convertToIST(date);
				let CaseOwner = element?.Parent?.Owner?.Name;

				caseList.push([
					"<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
						element?.Parent.Id +
						"/view' target='_blank'>" +
						element?.Parent?.CaseNumber +
						"</a>",
					AccountName,
					PnF,
					date.toLocaleDateString() + ISTTime,
					finalMessage,
					CaseOwner,
				]);
				// }
			});
		} else {
			document.getElementById("noCases").style.display = "block";
			let hr = selectedTime > 1 ? " Hours" : " Hour";

			document.getElementById("noCases").innerHTML =
				selectedView +
				" have no internal handover Since " +
				selectedTime +
				hr;
			spinnerRef.style.display = "none";
		}
		displayTable(caseList);
	} else {
		createBasicNotification(
			"../views/css/slds/assets/icons/standard/insights_120.png",
			"Session expired",
			"Current session has expired. Please refresh Orgcs",
			[],
		);
	}
}

function extractOnlyActionItemFromComment(input) {
	// Split the input into lines
	const lines = input.split("\n");

	// Variables to hold extracted parts
	let geoValues = [];
	let actionItem = [];
	let captureActionItem = false;

	// Process each line to extract required information
	for (const line of lines) {
		// Extract "From GEO" and "To GEO" lines
		if (line.startsWith("From GEO:")) {
			geoValues.push(line.replace("From GEO:", "").trim());
		} else if (line.startsWith("To GEO:")) {
			geoValues.push(line.replace("To GEO:", "").trim());
		}

		// Detect the start of the action item section
		if (line.startsWith("Action Item for next GEO:")) {
			captureActionItem = true;
			continue; // Skip the line with the header
		}

		// Collect action item lines
		if (captureActionItem) {
			actionItem.push(line.trim());
		}
	}

	// Format the output
	const geoOutput = geoValues.join(" To ");
	const actionItemOutput = actionItem.join("\n");

	// Return the combined result with an extra newline separating the parts
	return `>> ${geoOutput}\n\n${actionItemOutput}`;
}

// extended helper function for displayCases - to genrate filter for SOQL query dynamically
function createQueryParamWih(time, role, userId) {
	// Preparing filter by Owner
	let Id = role === "TE" ? userId : "";
	let filterByOwner = Id === "" ? "" : ` AND (Parent.ownerId='${Id}')`;

	let today = new Date();
	let dateTime = new Date(
		today.getTime() - 1000 * 60 * 60 * time,
	).toISOString();

	// Preparing filter by Date
	let filterByDate = `AND (CreatedDate > ${dateTime})`;

	return `${filterByDate} ${filterByOwner}`;
}
// extended helper function for displayCases convert only time -- @return -- 11:00 AM in  IST
function convertToIST(date) {
	var hours = date.getHours(); // gives the value in 24 hours format
	var AmOrPm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	var minutes = date.getMinutes();
	minutes = minutes <= 9 ? "0" + minutes : minutes;
	var finalTime = " " + hours + ":" + minutes + " " + AmOrPm;
	return finalTime;
}

// helper function used to create dynamic HTML from Array
async function displayTable(caseList) {
	if (caseList.length > 1) {
		copyHandoverBtnRef.style.display = "block";
		table = document.createElement("TABLE");
		table.setAttribute("class", "table");
		table.setAttribute("id", "handover-table");
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
				if (j == 4) {
					cell.style.maxWidth = "700px";
					cell.style.textAlign = "justify";
					cell.style.paddingRight = "10px";
					cell.style.paddingLeft = "10px";
					cell.style.whiteSpace = "break-spaces";
					cell.style.boxSizing = "border-box";
					cell.setAttribute("class", "handover-message");

					cell.innerHTML = caseList[i][j];
				} else {
					cell.style.verticalAlign = "middle";
					cell.innerHTML = caseList[i][j];
				}
			}
		}

		document.getElementById("noCases").style.display = "none";
		document.getElementById("caseListTable").style.display = "block";
		var dvTable = document.getElementById("dvTable");
		dvTable.innerHTML = "";
		dvTable.appendChild(table);
		spinnerRef.style.display = "none";
	} else {
		document.getElementById("noCases").style.display = "block";
		let hr = selectedTime > 1 ? " Hours" : " Hour";
		document.getElementById("noCases").innerHTML =
			selectedView +
			" have no internal handover since " +
			selectedTime +
			hr;
		spinnerRef.style.display = "none";
	}
}

// helper function to copy handover + formatting based on requirement
function copyHandoverToClipboard(tableId) {
	// Get the table element
	var table = document.getElementById(tableId);

	// Create a temporary container element
	var container = document.createElement("div");

	// Create a new empty document to store the selected table cells
	var selectedTable = document.createElement("table");

	// Loop through the table rows (excluding the header row)
	for (var i = 1; i < table.rows.length; i++) {
		var clonedRow = table.rows[i].cloneNode(true); // Clone the row

		clonedRow.querySelector(".handover-message").style.whiteSpace =
			"nowrap";

		// Append the cloned row to the selected table
		selectedTable.append(clonedRow);
	}

	// Select all table rows
	const rows = selectedTable.getElementsByTagName("tr");

	// Convert HTMLCollection to array for easier manipulation
	const rowsArray = Array.from(rows);

	// Loop through the rows and insert a <br> element after each row
	rowsArray.forEach((row) => {
		// Create a new <br> element
		const br = document.createElement("br");

		// Insert the <br> element after the current row
		row.parentNode.insertBefore(br, row.nextSibling);
	});
	console.log(selectedTable);

	// Append the selected table to the container
	container.appendChild(selectedTable);

	// Attach the container to the document
	document.body.appendChild(container);

	// Create a range object to store the selected table cells
	var range = document.createRange();

	// Select the container element
	range.selectNode(container);

	// Clear any existing selection
	window.getSelection().removeAllRanges();

	// Add the range to the selection
	window.getSelection().addRange(range);

	// Copy the selected content to the clipboard
	document.execCommand("copy");

	// Clean up by removing the selected range, table, and container
	window.getSelection().removeAllRanges();
	container.remove();

	// Display a success message
	console.log("Table copied to clipboard!");
}
