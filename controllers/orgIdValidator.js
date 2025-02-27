import { createBasicNotification } from "../service/notificationService.js";
import {
  orgIdValidator,
  createConnection,
  fetchOwnerInfoService,
  fetchUsersByGEO
} from "../service/salesforceService.js";
import Logger from "../utils/Logger.js";
import { getCurrentAuthContext } from "../utils/auth.js";
import {
  copyTableToClipboard,
  populateNavbarUserData,
} from "../utils/commonUtils.js";
import {
  MANAGER_EMAIL_IDS,
  PROQA_PROCESS_NAME,
  QA_TEAM_EMAIL_IDS,
} from "../utils/constants.js";
TEList();
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
});
document.getElementById("orgId-clear").addEventListener("click", () => {
  window.location.reload();
});

let currentAuthContext;
const nonManagerViewSection = document.getElementById("non-mgr-team-view");
const managerViewSection = document.getElementById("orgIdCard");
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
  }
  Logger.logEvent(PROQA_PROCESS_NAME, "Authorization successfull");
});

var header = [
  "Case Number",
  "Account Name",
  "Alert Name",
  "Received at :",
  "Updated By : ",
  "Status",
  "Closed",
];
let type = "wrongId";
document.getElementById("orgId-select").addEventListener("change", () => {
  type = document.getElementById("orgId-select").value;
});
console.log(type);
let teName ="";
document.getElementById("availableTE").addEventListener("change", () => {
  teName = document.getElementById("availableTE").value;
});

console.log(teName);

var audio = new Audio("../processComplete.mp3");

function playAudio() {
  audio.play().catch((error) => {
    console.error("Error playing audio:", error);
  });
}
var tableId = document.getElementById("orgId-checker-table");
var table = document.createElement("TABLE");
table.setAttribute("class", "table");
table.setAttribute("id", "orgId-error-table");
var selecter = document.getElementById("orgId-point");
insertHeader();
selecter.onclick = commentChecker;

let endDate;
let startDate;
document.getElementById("copy-data").addEventListener("click", () => {
  copyTableToClipboard("orgId-error-table");
  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Success !!",
    "Copied Results to clipboard",
    []
  );
});

async function commentChecker() {
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
    
    var result = await orgIdValidator(selectedDateTime, selectedDateTime1,selectedTE);
    console.log("Query results", result);
    if (result.length > 0) {
      processCommentsInBatches(result, 100);
      document.getElementById("my-spinner").style.display = "none";
    } else {
      document.getElementById("my-spinner").style.display = "none";
      setTimeout(() => {
        createBasicNotification(
          "../views/css/slds/assets/icons/standard/insights_120.png",
          "Uh-oh",
          "No Comments in the timeframe",
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

async function processCommentsInBatches(comments, batchSize) {
  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    await processBatch(batch);
    await sleep(2000);
  }
  playAudio();
  if (table.rows.length === 1) {
    const noCommentsMessage = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "We're good";
    noCommentsMessage.appendChild(cell);
    table.appendChild(noCommentsMessage);
  }

  document.getElementById("my-spinner").style.display = "none";

  createBasicNotification(
    "../views/css/slds/assets/icons/utility/success.svg",
    "Process Complete !!",
    "",
    []
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processBatch(comments) {
  await Promise.all(
    comments.map(async (comment) => {
      let result = validateOrgId(comment);

      if (
        result != "Correct Id" &&
        comment.Parent.FunctionalArea__c != "Unassigned"
      ) {
        const commentOwnerObjectPromise = fetchOwnerInfoService(
          comment.CreatedById
        );
        const commentOwnerObject = await commentOwnerObjectPromise;
        const commentOwner = commentOwnerObject
          ? commentOwnerObject.records[0].FirstName +
            " " +
            commentOwnerObject.records[0].LastName
          : "";
        const accountName =
          comment.Parent.AccountId === null
            ? "N/A"
            : comment.Parent.Account.Name;

        if (type != "All" && result == "Wrong Id") {
          var temp = [
            "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
              comment.ParentId +
              "/view' target='_blank'>" +
              comment.Parent.CaseNumber +
              "</a>",
            accountName,
            comment.Parent.FunctionalArea__c,
            comment.CreatedDate,
            commentOwner,
            result,
            comment.Parent.IsClosed,
          ];
          const row = table.insertRow(-1);
          for (let j = 0; j < 7; j++) {
            const cell = row.insertCell(j);
            const content = temp[j];

            if (content == "Wrong Id") {
              cell.innerHTML =
                '<span style="background-color: #DB1244 ;padding:2px; border-radius:4px;color:#E2E5DE">' +
                content +
                "</span>";
            } else if (content == "N/A") {
              cell.innerHTML =
                '<span style="background-color: #AFEEEE ;padding:2px; border-radius:4px;color:#008080">' +
                content +
                "</span>";
            } else {
              cell.innerHTML = content;
            }
          }
        } else if (type == "All") {
          var temp = [
            "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
              comment.ParentId +
              "/view' target='_blank'>" +
              comment.Parent.CaseNumber +
              "</a>",
            accountName,
            comment.Parent.FunctionalArea__c,
            comment.CreatedDate,
            commentOwner,
            result,
            comment.Parent.IsClosed,
          ];
          const row = table.insertRow(-1);
          for (let j = 0; j < 7; j++) {
            const cell = row.insertCell(j);
            const content = temp[j];

            if (content == "Wrong Id") {
              cell.innerHTML =
                '<span style="background-color: #DB1244 ;padding:2px; border-radius:4px;color:#E2E5DE">' +
                content +
                "</span>";
            } else if (content == "N/A") {
              cell.innerHTML =
                '<span style="background-color: #AFEEEE ;padding:2px; border-radius:4px;color:#008080">' +
                content +
                "</span>";
            } else {
              cell.innerHTML = content;
            }
          }
        }

        table.style.tableLayout = "fixed";
        tableId.appendChild(table);
        tableId.style.width = "100%";
        table.style.width = "100%";
      }
    })
  );
}

function validateOrgId(comment) {
  var updateOrgId = "";
  if (
    comment.CommentBody &&
    comment.CommentBody.indexOf("00D") !== -1 &&
    (comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == "'" ||
      comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == '"' ||
      comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == "#" ||
      comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == ":" ||
      comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == "-" ||
      comment.CommentBody[comment.CommentBody.indexOf("00D") - 1] == " ")
  ) {
    updateOrgId = comment.CommentBody.substring(
      comment.CommentBody.indexOf("00D"),
      comment.CommentBody.indexOf("00D") + 15
    );
    if (updateOrgId != comment.Parent.Case_Origin_OrgID__c) return "Wrong Id";
    else return "Correct Id";
  } else {
    return "N/A";
  }
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

var selectedTE = {};

async function TEList(callback) {

	let conn = await createConnection();
			 let managerIds = "";
			managerIds += "ManagerId in (";
			 managerIds +=
					"'005Hx000000EB8UIAW'" +
					"," +
					"'005Hx000001PMSzIAO'" +
					"," +
					"'005Hx000000EB8VIAW'" +
					"," +
					"'005Hx000000EB8TIAW'" +
					"," +
					"'005Hx000000EB8WIAW'" +
					"," +
					"'0050M00000DcCK4QAN'";
			
			let selectpart =
				"SELECT Id,ManagerId,Name from user where isActive=true AND ";
			let lastPart = "order by Name";
			managerIds += ") ";
			var query = selectpart + managerIds + lastPart;
			main(query);
		
	var availableTE = {};
	
	async function main(query) {
		conn.identity(async function (err, res) {
			
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
}
console.log(selectedTE);
