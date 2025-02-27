import {
  populateNavbarUserData,
  showErrorPopup,
} from "../utils/commonUtils.js";
import {
  getLoggedInUserData,
  getAllPromCasesForGho,
  getCommentedCaseGho,
  getNmiStatusCases,
} from "../service/salesforceService.js";

import { getSalesforceAuthContext } from "../utils/auth.js";
import { ORGCS_DOMAIN_NAME } from "../utils/constants.js";

let Commentedtemplate;
let NotCommentedtemplate;


let allCases = [];

let caseNumberSet = new Set();
let commentedList = [];

let newCaseCommentedList = new Set();
let newCaseNotCommentedList = new Set();

const containerFluid = document.querySelector(".user-container");
const mainfluid = document.querySelector(".main-container");

let commentedCaseArray = [];
let notCommentedCasesArray = [];
let errorMessage;
let closeErrorButton;

// Please remember to import this js as a module in corresponding html file
document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();

  errorMessage = document.getElementById("errorMessage");
  closeErrorButton = document.getElementById("close");

  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";

  let getnmistatus = document.getElementById("getnmistatus");
  let getGhoCaseButton = document.getElementById("getGhoCaseButton");

  getnmistatus.addEventListener("click", () => {
    document.getElementById("my-spinner").style.display = "block";
    containerFluid.classList.remove("active");
    showcases();
  });

  getGhoCaseButton.addEventListener("click", () => {
    //function to fetch eligible cases for gho
    document.getElementById("my-spinner").style.display = "block";
    mainfluid.classList.remove("active");
    getAllEligibleCasesForGho();
  });

  document.getElementById("postgho").addEventListener("click", () => {
    document.getElementById("my-spinner").style.display = "block";
    postGHOTemplateOnAllCases(
      commentedCaseArray,
      notCommentedCasesArray,
      Commentedtemplate,
      NotCommentedtemplate
    );
  });

  document.getElementById("updateNmiStatus").addEventListener("click", () => {
    document.getElementById("my-spinner").style.display = "block";
    update(nmicases);
  });

  //to clear the text from the text field
  document.getElementById("clear").addEventListener("click", () => {
    window.location.reload();
  });

  document.getElementById("clear1").addEventListener("click", () => {
    window.location.reload();
  });
});

//gho part start

//Step-1
async function getAllEligibleCasesForGho() {
  //making this div "user-container" so that in style we can display it hidden and only show when a button is pressed
  //and add it whenever we want to show
  containerFluid.classList.add("active");

  //to fetch user id
  const userDetails = await getLoggedInUserData();
  const userID = userDetails.user_id;

  //fetching from salesforce service
  const allGhoCases = await getAllPromCasesForGho(userID);

  allGhoCases.forEach((element) => {
    allCases.push(element.Id);
  });

  document.getElementById("totalCases").innerText = allGhoCases.length;

  var today = new Date();
  let dateTime = new Date(today.getTime() - 1000 * 60 * 60 * 8).toISOString();

  //fetching from salesforce service
  const commentedCasesGho = await getCommentedCaseGho(userID, dateTime);

  commentedCasesGho.forEach((element) => {
    commentedList.push(element.ParentId);
    caseNumberSet.add(
      "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
        element.ParentId +
        "/view' target='_blank'>" +
        element.Parent.CaseNumber +
        "</a>"
    );
  });

  document.getElementById("caseNumberSet").innerHTML = new Array(
    ...caseNumberSet
  ).join("--");

  document.getElementById("casesCommented").innerText = caseNumberSet.size;

  document.getElementById("CasesNotCommented").innerText =
    allGhoCases.length - caseNumberSet.size;

  allCases.forEach((ind) => {
    if (!commentedList.includes(ind)) {
      //countOfNotCommentedAlerts++;
      newCaseNotCommentedList.add(ind);
    }
  });

  allCases.forEach((ind) => {
    if (commentedList.includes(ind)) {
      //countOfCommentedAlerts++;
      newCaseCommentedList.add(ind);
    }
  });

  //event listener on Comnented cases btn
  document.getElementById("templatebtn").addEventListener("click", () => {
    Commentedtemplate = getCommentedCaseTemplate();
    document.getElementById("addGHOTemplateCommented").innerHTML =
      "" + Commentedtemplate + "";
    commentedCaseArray = [...newCaseCommentedList];

    NotCommentedtemplate = getNotCommentedCaseTemplate();
    document.getElementById("addGHOTemplateNotCommented").innerHTML =
      "" + NotCommentedtemplate + "";
    notCommentedCasesArray = [...newCaseNotCommentedList];
  });

  document.getElementById("my-spinner").style.display = "none";
}

//step 2 to get template of Commneted Cases

let selectedMenu;
function getCommentedCaseTemplate() {
  Commentedtemplate = "";

  const geo = document.getElementById("current-shift").innerText;
  let nextgeo =
    geo === "AMER"
      ? "APAC"
      : geo === "APAC"
      ? "EMEA"
      : geo === "EMEA"
      ? "AMER"
      : "APAC";

  selectedMenu = document.getElementById("selected-menu").value;

  if (selectedMenu === "weekends") {
    Commentedtemplate = "===========WOC INTERNAL============\n";
  } else if (selectedMenu === "weekdays") {
    Commentedtemplate = "===========INTERNAL============\n";
  }

  Commentedtemplate +=
    "Proactive Monitoring Global Handover\n" +
    "From GEO: " +
    geo +
    "\n" +
    "To GEO: " +
    nextgeo +
    "\n" +
    "Actions taken in your GEO?\n" +
    "================================\n" +
    "- Updated customer with the details for the alerts triggered\n" +
    "- Monitored for customer response\n" +
    "Expected Action(s) for the next GEO:\n" +
    "================================\n" +
    "- Monitor for new alerts and reach out to customer about the root cause of the new alert with further details if any.\n" +
    "- Assist customer further accordingly.\n" +
    "Reference:\n" +
    "================================\n" +
    "- Potential gus/bug investigation\n" +
    "- External resource Community post\n" +
    "- Chatter post\n" +
    "- Splunk Queries\n";

  return Commentedtemplate;
}

//step-3 to get template of Not commented cases
function getNotCommentedCaseTemplate() {
  NotCommentedtemplate = "";

  const geo = document.getElementById("current-shift").innerText;

  let nextgeo =
    geo === "AMER"
      ? "APAC"
      : geo === "APAC"
      ? "EMEA"
      : geo === "EMEA"
      ? "AMER"
      : "APAC";

  selectedMenu = document.getElementById("selected-menu").value;

  if (selectedMenu === "weekends") {
    NotCommentedtemplate = "===========WOC INTERNAL============\n" + "";
  } else if (selectedMenu === "weekdays") {
    NotCommentedtemplate = "===========INTERNAL============\n" + "";
  }

  NotCommentedtemplate +=
    "Proactive Monitoring Global Handover\n" +
    "From GEO: " +
    geo +
    "\n" +
    "To GEO: " +
    nextgeo +
    "\n" +
    "Actions taken in your GEO?\n" +
    "================================\n" +
    "- No Alerts in " +
    geo +
    " hours\n" +
    "Expected Action(s) for the next GEO:\n" +
    "================================\n" +
    "- Monitor for new alerts and reach out to customer about the root cause of the new alert with further details if any.\n" +
    "- Assist customer further accordingly.\n";

  return NotCommentedtemplate;
}

//step-4--post on commnents
async function postGHOTemplateOnAllCases(
  commentedCaseArray,
  notCommentedCasesArray,
  Commentedtemplate,
  NotCommentedtemplate
) {
  Commentedtemplate = document.getElementById("addGHOTemplateCommented").value;
  NotCommentedtemplate = document.getElementById(
    "addGHOTemplateNotCommented"
  ).value;

  let objArray = [];

  commentedCaseArray.forEach((ind) => {
    let a = {
      ParentId: ind,
      CommentBody: Commentedtemplate,
    };
    objArray.push(a);
  });

  notCommentedCasesArray.forEach((ind) => {
    let a = {
      ParentId: ind,
      CommentBody: NotCommentedtemplate,
    };
    objArray.push(a);
  });

  let updateCount = 0;
  let errorCount = 0;

  let session = await getSalesforceAuthContext();

  let conn = new jsforce.Connection({
    serverUrl: ORGCS_DOMAIN_NAME,
    sessionId: session.orgcs,
  });

  // if(objArray.length>0){
  //   objArray.forEach(ind => {
  //     console.log(ind.CommentBody);
  //   });
  // }

  conn
    .sobject("CaseComment")
    .create(objArray, { allowRecursive: true }, function (err, rets) {
      if (err) {
        errorCount++;
        console.error(err);
      }
      for (var i = 0; i < rets.length; i++) {
        if (rets[i].success) {
          updateCount++;
          //console.log("Created record id : " + rets[i].id);
        }
      }
      showErrorPopup(
        "Cases updated : " +
          updateCount +
          "  Cases Failed to update: " +
          errorCount,
        true
      );

      document.getElementById("my-spinner").style.display = "none";
    });
}

//end gho part
let nmicasesset = new Set();
let nmicases = new Set();

async function showcases() {
  mainfluid.classList.add("active");
  //to fetch user id
  const userDetails = await getLoggedInUserData();
  const userID = userDetails.user_id;

  const getnmicases = await getNmiStatusCases(userID);

  nmicases = new Set();

  if (getnmicases.length === 0) {
    showErrorPopup("No cases to update", true);
    document.getElementById("nmicasestatus").innerText = 0;
    document.getElementById("nocases").innerText = 0;
  } else {
    getnmicases.forEach((element) => {
      nmicases.add(element);
    });

    console.log(nmicases);

    getnmicases.forEach((element) => {
      nmicasesset.add(
        "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
          element.Id +
          "/view' target='_blank'>" +
          element.CaseNumber +
          "</a>"
      );
    });

    document.getElementById("nocases").innerText = getnmicases.length;

    document.getElementById("nmicasestatus").innerHTML = new Array(
      ...nmicasesset
    ).join("--");

    console.log(nmicases);
  }

  document.getElementById("my-spinner").style.display = "none";
}

async function update(nmicases) {
  let objArray = [];

  nmicases.forEach((element) => {
    let a = {
      Id: element.Id,
      Sub_Status__c: "Customer-OOO",
    };
    objArray.push(a);
  });

  let updatecount = 0;
  let errcount = 0;

  let session = await getSalesforceAuthContext();

  let conn = new jsforce.Connection({
    serverUrl: ORGCS_DOMAIN_NAME,
    sessionId: session.orgcs,
  });

  conn
    .sobject("Case")
    .update(objArray, { allowRecursive: true }, function (err, rets) {
      if (err) {
        errcount++;
        console.error(err);
      }
      for (var i = 0; i < rets.length; i++) {
        if (rets[i].success) {
          updatecount++;
          //console.log("Updated Successfully : " + rets[i].id);
        }
      }

      showErrorPopup(
        "Cases updated : " +
          updatecount +
          "  Cases Failed to update: " +
          errcount,
        true
      );

      document.getElementById("my-spinner").style.display = "none";
    });
}
