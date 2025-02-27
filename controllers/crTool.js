import {
	copyTableToClipboard,
	populateNavbarUserData,
} from "../utils/commonUtils.js";
import { getSalesforceAuthContext } from "../utils/auth.js";
import { getKeyFromStorage } from "../service/localStorage.js";
import { createBasicNotification } from "../service/notificationService.js";

import {
	createConnection,
	fetchAlertsDuringReassignmentService,
	fetchCaseOwnerId,
	fetchCasesTobeTaken,
	fetchCasesforMDE,
	fetchOwnerInfoService,
	fetchUsersByGEO,
	getDeploymentCaseForGHO,
	getLoggedInUserData,
} from "../service/salesforceService.js";
let mde;

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
	populateNavbarUserData();
	const spinner = document.getElementById("my-spinner");
	setTimeout(() => {
		spinner.style.display = "none";
	}, 1000);
	caseReassignment();
});

async function caseReassignment(callback) {
	let conn = await createConnection();

	conn.identity(function (err, res) {
		var geo = document.getElementById("geo-select");

		geo.addEventListener("change", () => {
			//added by Sandeep for WI-01
			const autoSelectWrapper = document.querySelector(
				"div.autoSelectMTEWrapper"
			);
			if (geo.value === "Select") {
				autoSelectWrapper.style.display = "none";
			} else {
				autoSelectWrapper.style.display = "Block";
			}
			//END: added by Sandeep for WI-01
			let managerIds = "";
			managerIds += "ManagerId in (";
			if (geo.value == "APAC") {
				managerIds += "'005Hx000000EBerIAG'" + "," + "'005Hx000001PMSzIAO'";
			} else if (geo.value == "EMEA") {
				managerIds += "'005Hx000000EB8UIAW'" + "," + "'005Hx000000EB8VIAW'";
			} else if (geo.value == "AMER") {
				managerIds += "'005Hx000000EB8WIAW'" + "," + "'0053y00000GL7mAAAT'";
			} else {
				managerIds +=
					"'005Hx000000EB8UIAW'" +
					"," +
					"'005Hx000001PMSzIAO'" +
					"," +
					"'005Hx000000EB8VIAW'" +
					"," +
					"'005Hx000000EBerIAG'" +
					"," +
					"'005Hx000000EB8WIAW'" +
					"," +
					"'0050M00000DcCK4QAN'"  +
					"," +
					"'0053y00000GL7mAAAT'";
			}
			let selectpart =
				"SELECT Id,ManagerId,Name from user where isActive=true AND ";
			let lastPart = "order by Name";
			managerIds += ") ";
			var query = selectpart + managerIds + lastPart;
			main(query);
		});
	});
	var availableTE = {};
	var selectedTE = {};
	var mdeId;

	var toBeDeletedIds = [];

	async function main(query) {
		conn.identity(async function (err, res) {
			mdeId = res.user_id;
			var res = await fetchUsersByGEO(query);
			for (let i = 0; i < res.records.length; i++) {
				availableTE[res.records[i].Id] = res.records[i];
			}
			console.log(availableTE);
			var e = "";
			for (let x = 0; x < res.records.length; x++) {
				e =
					e +
					'<div class="slds-listbox__option slds-listbox__option_plain slds-media slds-media_small slds-media_inline slds-is-selected" aria-selected="false" draggable="true" role="option" tabindex="-1" id=div' +
					res.records[x].Id +
					' aria-name="' +
					res.records[x].Name.toLowerCase() +
					'"><span class="slds-media__body">' +
					res.records[x].Name +
					"</span></div>";
			}

			let t = document.getElementById("availableTE");
			t.innerHTML = e;

			var lis = document
				.getElementById("availableTE")
				.getElementsByTagName("div");

			for (let i = 0; i < lis.length; i++) {
				let uid = "div" + res.records[i].Id;
				let teHtmlElement = document.getElementById(uid);

				teHtmlElement.addEventListener("click", function (e) {
					let className = teHtmlElement.className;
					if (!className.includes("inSelected")) {
						let isSelected =
							teHtmlElement.getAttribute("aria-selected") === "true";
						if (isSelected) {
							teHtmlElement.setAttribute("aria-selected", "false");
							if (selectedTE[res.records[i].Id]) {
								delete selectedTE[res.records[i].Id];
							}
						} else {
							teHtmlElement.setAttribute("aria-selected", "true");
							if (!selectedTE[res.records[i].Id]) {
								selectedTE[res.records[i].Id] = res.records[i];
							}
						}
					}
					e.stopPropagation();
					return false;
				});
			}
		});
	}

	$(function () {
		$("#moveToSelectedBtn").on("click", function () {
			$("#availableTE div[aria-selected='true']").each(function () {
				var isSelected = $(this).attr("aria-selected");

				if (isSelected === "true") {
					$(this).attr("aria-selected", "false");
					$(this).addClass("inSelected");
					$(this).remove().appendTo("#selectedTE");
					addAnotherEvent(this);
				}
			});
			let selectList = document
				.getElementById("selectedTE")
				.getElementsByTagName("div");
			let n = selectList.length;
			document.getElementById("countSelectedTE").innerHTML =
				"Selected Engineers" + " : <b><i>" + n + "</i></b>";
		});

		$("#moveToAvailableBtn").on("click", function () {
			$("#selectedTE div[aria-selected='true']").each(function () {
				var isSelected = $(this).attr("aria-selected");

				if (isSelected === "true") {
					$(this).attr("aria-selected", "false");
					$(this).removeClass("inSelected");
					$(this).remove().appendTo("#availableTE");

					toBeDeletedIds.forEach((id) => {
						delete selectedTE[id];
					});
					toBeDeletedIds = [];
				}
			});
			let selectList = document
				.getElementById("selectedTE")
				.getElementsByTagName("div");
			let n = selectList.length;
			document.getElementById("countSelectedTE").innerHTML =
				"Selected Engineers" + " : <b><i>" + n + "</i></b>";
		});
	});

	function addAnotherEvent(ele) {
		if (ele) {
			ele.removeEventListener("click", clickEventHandler);
			ele.addEventListener("click", clickEventHandler);
		}
	}

	function clickEventHandler(e) {
		var className = $(this).attr("class");
		if (className.includes("inSelected")) {
			let isSelected = this.getAttribute("aria-selected") == "true";
			if (isSelected) {
				this.setAttribute("aria-selected", "false");
				let elementId = $(this).attr("id");
				elementId = elementId.substring(3);
				if (toBeDeletedIds.includes(elementId)) {
					let indi = toBeDeletedIds.indexOf(elementId);
					toBeDeletedIds.splice(indi, 1);
				}
			} else {
				this.setAttribute("aria-selected", "true");
				let elementId = $(this).attr("id");
				elementId = elementId.substring(3);
				toBeDeletedIds.push(elementId);
			}
		}
		e.stopPropagation();
		return false;
	}

	// START for Assign Cases

	var tobeAssignedIds = [];
	var finalListOfUsersForAssigningCases = {};
	var tobeGrabbedIds = [];
	var finalListOfUsersForTakingCases = {};
	let assignCasesBtn = document.getElementById("assignCases");
	assignCasesBtn.addEventListener("click", async () => {
		document.getElementById("my-spinner").style.display = "block";

		// get the selected engg element from dom
		// extract the names of the engg present in the ul
		// use this teList and pass to assignCasesfun args

		let selectList = document
			.getElementById("selectedTE")
			.getElementsByTagName("div");

		for (let j = 0; j < selectList.length; j++) {
			let g = selectList[j].getAttribute("id");
			g = g.substring(3);
			tobeAssignedIds.push(g);
		}
		for (let k = 0; k < tobeAssignedIds.length; k++) {
			finalListOfUsersForAssigningCases[tobeAssignedIds[k]] =
				availableTE[tobeAssignedIds[k]];
		}
		tobeAssignedIds = [];

		console.log(mdeId);
		try {
			var result = await fetchCasesforMDE(mdeId);
		} catch {
			createBasicNotification(
				"../views/css/slds/assets/icons/utility/success.svg",
				"Failed !!",
				"Please select Geo",
				[]
			);
			document.getElementById("my-spinner").style.display = "none";
		}
		if (
			result.records != "" &&
			result.records != undefined &&
			result.records != null
		) {
			assignCasesfun(result.records, finalListOfUsersForAssigningCases);

			//Pointing the obj to empty obj after forming the query

			finalListOfUsersForAssigningCases = {};
		}
	});

	function assignCasesfun(caseList, teList) {
		var teListArr = Object.keys(teList);
		var i = 0;
		var updateCase = [];
		if (teListArr != null && teListArr.length != 0) {
			var teListSize = teListArr.length;

			for (var a in caseList) {
				var x = {
					Id: caseList[a].Id,
					ownerId: teListArr[i],
				};
				updateCase.push(x);

				if (i < teListSize - 1) {
					i = i + 1;
				} else i = 0;
			}

			if (updateCase.length > 0) {
				let errorOccurred = false;
				for (let i = 0; i < updateCase.length; i++) {
					conn
						.sobject("case")
						.update(
							updateCase[i],
							{ headers: { "Sforce-Auto-Assign": false } },
							function (err, rets) {
								if (err) {
									errorOccurred = true;
									console.log(err);
								}

								console.log("success", rets);
							}
						);
				}
				setTimeout(function () {
					document.getElementById("my-spinner").style.display = "none";

					if (errorOccurred) {
						createBasicNotification(
							"../views/css/slds/assets/icons/standard/insights_120.png",
							"SUCCESS!!",
							"Some Cases might have missed, please check your queue",
							[]
						);
					} else {
						createBasicNotification(
							"../views/css/slds/assets/icons/standard/insights_120.png",
							"SUCCESS!!",
							"Cases are assigned to the Selected Engineers!",
							[]
						);
					}
				}, 5000);
			}
		} else {
			createBasicNotification(
				"../views/css/slds/assets/icons/utility/success.svg",
				"Failed !!",
				"Please select Engineers",
				[]
			);
			document.getElementById("my-spinner").style.display = "none";
		}
	}

	// END for Assign Cases

	// START for Take Cases

	let grabCasesfunBtn = document.getElementById("grabCases");
	grabCasesfunBtn.addEventListener("click", async () => {
		document.getElementById("my-spinner").style.display = "block";

		let selectList = document
			.getElementById("selectedTE")
			.getElementsByTagName("div");
		for (let j = 0; j < selectList.length; j++) {
			let g = selectList[j].getAttribute("id");
			g = g.substring(3);
			tobeGrabbedIds.push(g);
		}
		for (let k = 0; k < tobeGrabbedIds.length; k++) {
			finalListOfUsersForTakingCases[tobeGrabbedIds[k]] =
				availableTE[tobeGrabbedIds[k]];
		}
		tobeGrabbedIds = [];

		let selectPart = "SELECT Id FROM Case WHERE ";
		let middlePart =
			"IsClosed =false AND CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND ";
		var grabteListArr = Object.keys(finalListOfUsersForTakingCases);

		var grabUserId = "";
		for (let l = 0; l < grabteListArr.length; l++) {
			grabUserId = grabUserId + "'" + grabteListArr[l] + "'" + ",";
		}
		grabUserId = grabUserId.slice(0, -1) + ")";
		let userIds = "ownerId in (";
		let orderByClause =
			" Order by Parent.Last_Public_Activity_Date_Time__c DESC NULLS LAST LIMIT 1999";

		let queryGrab =
			selectPart + middlePart + userIds + grabUserId + orderByClause;

		var result = await fetchCasesTobeTaken(queryGrab);

		//Pointing the obj to empty obj after forming the query
		finalListOfUsersForTakingCases = {};

		if (
			result.records != "" &&
			result.records != undefined &&
			result.records != null
		) {
			grabCasesfun(result.records);
		}
	});

	function grabCasesfun(caseListGrab) {
		console.log(mdeId);
		var updateCaseGrab = [];
		if (caseListGrab != null && caseListGrab.length != 0) {
			for (var a in caseListGrab) {
				var x = {
					Id: caseListGrab[a].Id,
					ownerId: mdeId,
				};
				updateCaseGrab.push(x);
			}

			if (updateCaseGrab.length > 0) {
				for (let i = 0; i < updateCaseGrab.length; i++) {
					conn
						.sobject("case")
						.update(
							updateCaseGrab[i],
							{ headers: { "Sforce-Auto-Assign": false } },
							function (err, rets) {
								if (err) console.log(err);
								console.log("success", rets);
							}
						);
				}
				setTimeout(function () {
					createBasicNotification(
						"../views/css/slds/assets/icons/standard/insights_120.png",
						"SUCCESS!!",
						"Cases are assigned to you",
						[]
					);
					document.getElementById("my-spinner").style.display = "none";
				}, 5000);
			}
		}
	}
}

// END for Take Cases

var alertsDuringReassignment = [];
var adrData = [];

document
	.getElementById("alertsDuringReassignment")
	.addEventListener("click", async () => {
		document.getElementById("my-spinner").style.display = "block";

		var timeStart = new Date();
		getKeyFromStorage("geo").then((res) => {
			let zone = res.toUpperCase();
			if (zone == "AMER") {
				timeStart.setUTCHours(16, 0, 0, 0);
			} else if (zone == "EMEA") {
				timeStart.setUTCHours(8, 0, 0, 0);
			} else if (zone == "APAC") {
				timeStart.setUTCHours(0, 0, 0, 0);
			}
		});
		fetchAlertsDuringReassignment(timeStart);
	});

async function fetchAlertsDuringReassignment(timeStart) {
	let session = await getSalesforceAuthContext();
	let con = new jsforce.Connection({
		serverUrl: "https://orgcs.my.salesforce.com",
		sessionId: session.orgcs,
	});

	var today = new Date();

	// Alert should be created on or after timeStart and on or before endtime
	var timeStart = new Date(timeStart);
	timeStart = timeStart.toISOString();

	var endTime = new Date(today).toISOString();
	var result = await fetchAlertsDuringReassignmentService(endTime, timeStart);

	if (result == null || result.length == 0) {
		alert("no alerts");
	} else {
		prepareAlertData(result)
			.then(() => {
				console.log("done");
			})
			.catch((error) => {
				console.log(error);
			});
	}
}

//filter out the cleared and Info alerts
async function prepareAlertData(result) {
	adrData = [];
	adrData.push(["Case Number", "Alert Name", "Severity", "Case Owner"]);
	console.log("Results before filtering out ", result);
	let session = await getSalesforceAuthContext();
	let con = new jsforce.Connection({
		serverUrl: "https://orgcs.my.salesforce.com",
		sessionId: session.orgcs,
	});

	if (result.records.length > 0) {
		for (const alert of result.records) {
			var severity = "";

			if (
				!alert.CommentBody.includes("INFO") &&
				!alert.CommentBody.includes("OKAY") &&
				!alert.CommentBody.includes("OK") &&
				!alert.CommentBody.includes("CLEARED") &&
				!alert.CommentBody.includes("INFORMATION") &&
				!alert.CommentBody.includes("cleared") &&
				!alert.CommentBody.includes("The Monitoring Team")
			) {
				if (alert.CommentBody.includes("Severity: CRITICAL")) {
					severity = "CRITICAL";
				} else if (alert.CommentBody.includes("Severity: WARNING")) {
					severity = "WARNING";
				} else if (alert.CommentBody.includes("Severity: EXHAUSTED")) {
					severity = "EXHAUSTED";
				}

				try {
					const result = await fetchOwnerInfo(alert.Parent.OwnerId);
					if (result.records[0] != null) {
						adrData.push([
							alert.Parent.CaseNumber,
							alert.Parent.FunctionalArea__c,
							severity,
							result.records[0].FirstName + " " + result.records[0].LastName,
						]);
					}
				} catch (error) {
					console.log("Error fetching owner info:", error);
				}
			}
		}
	} else {
		alertsDuringReassignment.push({ msg: "No alerts during reassignment" });
	}
	displayadr(adrData);
}

async function fetchOwnerInfo(id) {
	var session = await getSalesforceAuthContext();
	var con = new jsforce.Connection({
		serverUrl: "https://orgcs.my.salesforce.com",
		sessionId: session.orgcs,
	});
	var ownerInfo = await fetchOwnerInfoService(id);

	return ownerInfo;
}

//function to display alerts during reassignment

async function displayadr(caseList) {
	var tableId = document.getElementById("alerts-during-reassignment-table");
	tableId.innerHTML = "";
	if (caseList.length > 1) {
		var table = document.createElement("TABLE");
		table.setAttribute("class", "table");
		table.setAttribute("id", "alertsHO-table");
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
		tableId.appendChild(table);
	}
	document.getElementById("my-spinner").style.display = "none";
}

// //end of posting alerts during reassignment

document.querySelector("#copyTable").style.display = "none";
document
	.querySelector("#alertsDuringReassignment")
	.addEventListener("click", showBtn);

function showBtn(e) {
	document.querySelector("#copyTable").style.display = "block";
	e.preventDefault();
}

document.getElementById("copyTable").addEventListener("click", () => {
	copyTableToClipboard("alertsHO-table");
	createBasicNotification(
		"../views/css/slds/assets/icons/utility/success.svg",
		"Success !!",
		"Copied Results to clipboard",
		[]
	);
});

////  ------------ added by sandeep for WI-1

document.getElementById("AutoSelectMTE").addEventListener("click", () => {
	var inputVal = $("#AutoSelectInput").val().toLowerCase();
	console.log(inputVal);
	inputVal = inputVal.split("\n");
	var eleArr = [];
	console.log(inputVal);
	for (var i = 0; i <= inputVal.length; ++i) {
		var ele = $(`div[aria-name^='${inputVal[i]}'`);
		ele.click();
		eleArr.push(ele);
	}
	console.log(eleArr);
	moveToSelectedBtn.click();
});
