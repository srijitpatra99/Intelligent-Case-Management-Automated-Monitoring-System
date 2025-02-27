// Please remember to import this js as a module in corresponding html file
let currentClosureList;
let currentlyAuditedCaseNumber;

import {
  copyTableToClipboard,
  getClosureBounds,
  getRandomNoOfElementsFromArray,
  showLoadingSpinner,
 // hideBulkLoadingSpinner,
 // showBulkLoadingSpinner,
  hideLoadingSpinner,
  populateNavbarUserData,
} from "../utils/commonUtils.js";
import {
  QA_TEAM_EMAIL_IDS,
  PROM_CASE_AUDITED_TAG,
  AUDIT_TYPE_CASE_CREATION,
  ORG_CS_CASE_URL,
  AUDIT_TYPE_CASE_UPDATE,
  AUDIT_TYPE_CASE_CLOSURE,
  PROQA_PROCESS_NAME,
} from "../utils/constants.js";
import {
  getCurrentAuthContext,
  getSalesforceAuthContext,
} from "../utils/auth.js";
import {
  fetchCaseComments,
  fetchClosureCasesForQA,
  fetchFieldFromRecord,
  fetchRecordNameById,
  postInternalCommentOnAuditedCase,
} from "../service/salesforceService.js";
import { createBasicNotification } from "../service/notificationService.js";
import { Audit } from "../models/Audit.js";
import { createQaRecord } from "../service/qaService.js";
import Logger from "../utils/Logger.js";

// let currentStartIndQABtn;
// let currentMarkAsDoneBtn;


document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();

  const qaTeamViewSection = document.getElementById("qa-team-view");
  const nonQaTeamViewSection = document.getElementById("non-qa-team-view");
  const fetchCasesForQaBtn = document.getElementById("fetch-qa-cases-btn");
  const startBulkQaBtn = document.getElementById("start-qa-btn");
  const markAllAsDone = document.getElementById("mark-all-done-btn");
  const tableBody = document.querySelector("#closed-cases-table tbody");
  const ccTableDiv = document.getElementById("cc-table");
  const qaTableDiv = document.getElementById("qa-table");
  const qaTable = document.getElementById("qa-results-table");
  const qaTableBody = document.querySelector("#qa-table tbody");
  const clearBtn = document.getElementById("clear-btn");
  const caseLimitDropdown = document.getElementById("case-limit");
  const alertDropdown = document.getElementById("alert-select");
  const teDropdown = document.getElementById("te-select");
  const copyTableBtn = document.getElementById("copy-table-btn");
  const downloadProcessLogsBtn = document.getElementById("download-log-btn");
  const caseNumberInput = document.getElementById("case-number");
  const dataEntrySectionDiv = document.getElementById("data-entry-section");
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";
  

  let currentAuthContext;

  localStorage.removeItem('log_proqa'); // Removes the log file for the 'proqa' process

  getCurrentAuthContext().then((result) => {
    Logger.logEvent(PROQA_PROCESS_NAME, "Authorizing...");
    currentAuthContext = result;
    if (currentAuthContext != null) {
      let role = currentAuthContext.role;
      let emailId = currentAuthContext.email;

      if (
        (role == "QA" || role == "Manager") &&
        QA_TEAM_EMAIL_IDS.includes(emailId)
      ) {
        nonQaTeamViewSection.style.display = "None";
      } else {
        qaTeamViewSection.style.display = "None";
      }
    }
    Logger.logEvent(PROQA_PROCESS_NAME, "Authorization successfull");
  });

  ccTableDiv.style.display = "None";
  qaTableDiv.style.display = "None";
  clearBtn.style.display = "None";
  startBulkQaBtn.style.display = "None";
  markAllAsDone.style.display = "None";

  async function processCaseNumbersSequentially(id, caseNumber, c) {
    await startQa(id, caseNumber, c);
  }


 fetchCasesForQaBtn.addEventListener("click", async () => {
    let caseNumbersHTML = caseNumberInput.value.trim();
    let caseNumbers = caseNumbersHTML.split(",").map((item) => item.trim());
     console.log(caseNumbers, caseNumbers.length);
    if (caseNumbers.length > 0 && caseNumbers[0] !== "") {
      let specificCases = [];
      for (const caseNumber of caseNumbers) {
        const result = await fetchFieldFromRecord(
          ["Id"],
          "Case",
          "CaseNumber",
          caseNumber
        );
        const caseId = result.Id;
      
      // Add the fetched case to currentClosureList
      specificCases.push({ Id: caseId, CaseNumber: caseNumber });
        await processCaseNumbersSequentially(result.Id, caseNumber, null);
        currentClosureList = specificCases;

      }
    } else {
      fetchCasesForQaBtnHandler(
        tableBody,
        qaTableBody,
        caseLimitDropdown.value,
        alertDropdown.value,
        teDropdown.value
      );
      ccTableDiv.style.display = "block";
      startBulkQaBtn.style.display = "inline";
      markAllAsDone.style.display = "inline";
    }
    fetchCasesForQaBtn.style.display = "None";
    clearBtn.style.display = "inline";
    markAllAsDone.style.display = "inline"; 
    dataEntrySectionDiv.style.display = "None";
  });

  clearBtn.addEventListener("click", () => {
    while (tableBody.firstChild) {
      tableBody.removeChild(tableBody.firstChild);
    }
    clearBtn.style.display = "None";
    ccTableDiv.style.display = "None";
    qaTableDiv.style.display = "None";
    caseLimitDropdown.value = "";
    alertDropdown.value = "";
    teDropdown.value = "";
    fetchCasesForQaBtn.style.display = "inline";
    startBulkQaBtn.style.display = "None";
    markAllAsDone.style.display = "None";
    this.location.reload();
  });

startBulkQaBtn.addEventListener("click", async () => {
  // Optionally notify the user that the bulk job has started
  showNotification("Bulk QA process started...");

  try {
    // Create an array of promises to process each case in parallel
    const promises = currentClosureList.map(closedCase => {
      return startQa(closedCase.Id, closedCase.CaseNumber, null);
    });

    // Wait for all QA audits to complete using Promise.all
    await Promise.all(promises);

    // Notify the user when all cases have been processed successfully
    showNotification("Bulk QA process completed successfully!", "success");
  } catch (error) {
    console.error("An error occurred while processing the bulk QA audits:", error);

    // Notify the user if there was an error
    showNotification("An error occurred during the bulk QA process.", "error");
  }
});

// startBulkQaBtn.addEventListener("click", async () => {
//   showNotification("Bulk QA process started...");
//   for (const closedCase of currentClosureList) {
//     console.log(closedCase);
//     await startQa(closedCase.Id,closedCase.CaseNumber,null);
//   }
//   showNotification("Bulk QA process completed successfully!", "success");
// });


//mark all as done

markAllAsDone.addEventListener("click", async function()  {
  // Notify user that the bulk process has started
  showNotification("Marking all cases as closed...");
  for (const closedCase of currentClosureList) {
    // For each closed case, call the markAsDone function
    // console.log("closedCase");
    
    // For bulk processing, we will not pass individual "startQaBtn" and "markAsDoneBtn" as they won't be needed for each case
    await markAsDone2(null, null, closedCase.Id, closedCase.CaseNumber);
  }


    // Notify user that the bulk operation is complete
    showNotification("All cases have been marked as closed successfully!", "success");

});


// Function to show a notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.textContent = message;

  // Append the notification to the body or a specific container
  document.body.appendChild(notification);

  // Automatically hide the notification after 5 seconds
  setTimeout(() => {
    notification.style.display = "none";
  }, 3600000);
}








  copyTableBtn.addEventListener("click", () => {
    copyTableToClipboard("qa-results-table");
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/success.svg",
      "Success !!",
      "Copied QA Results to clipboard",
      []
    );
  });

  // downloadProcessLogsBtn.addEventListener("click", () => {
  //   Logger.downloadLogFile(PROQA_PROCESS_NAME);
  // });
});

async function fetchCasesForQaBtnHandler(
  tableBody,
  qaTableBody,
  limit,
  alert,
  te
) {
  Logger.logEvent(PROQA_PROCESS_NAME, `Picking up ${limit} cases randomly`);
  if (!limit) {
    limit = 5;
  }
  showLoadingSpinner(`QA Process: Picking up ${limit} cases randomly`);
  // if table already has some data
  while (tableBody.firstChild) {
    tableBody.removeChild(tableBody.firstChild);
  }

  let closedCases;
  let session = await getSalesforceAuthContext();
  if (!session.orgcs) {
    // raise exception msg
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error occured !!",
      "OrgCS Session expired. Please re-login to OrgCS.",
      []
    );
    hideLoadingSpinner();
    return;
  }

  let bounds = getClosureBounds();
  if (!bounds) {
    // raise exception msg
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error occured !!",
      "Error occured while fetching Closure Bounds for QA",
      []
    );
    Logger.logEvent(
      PROQA_PROCESS_NAME,
      `Error occured while fetching Closure Bounds for QA`
    );
    hideLoadingSpinner();
    return;
  }
  if (!limit) {
    limit = 10;
  }

  closedCases = await fetchClosureCasesForQA(bounds, alert, te);

  Logger.logEvent(PROQA_PROCESS_NAME, `Randomizing closed cases...`);

  closedCases = getRandomNoOfElementsFromArray(closedCases, closedCases.length);
  // currentClosureList = closedCases;

  if (closedCases == null || closedCases.length == 0) {
    // raise exception msg
    console.log("Didnt fetch any closed cases");
    return;
  }
  // console.log(currentClosureList);
  // Removing cases having #ProMCaseAudited tag
  let unauditedClosedCases = await filterClosedCases(closedCases,limit);
  // console.log(unauditedClosedCases);

  currentClosureList = unauditedClosedCases;
  if (!unauditedClosedCases) {
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error !!",
      "No audited case found in this random list. Please retry fetching cases",
      []
    );
    console.log("no unaudited cases");
    Logger.logEvent(
      PROQA_PROCESS_NAME,
      `No audited case found in this random list. Please retry fetching cases`
    );
    hideLoadingSpinner();
    return;
  }

  let btnCounter = 0;
  for (const closedCase of unauditedClosedCases) {
    let productFeature = "";
    if (closedCase.CaseReportingTaxonomy__c) {
      productFeature = await fetchRecordNameById(
        "CaseReportingTaxonomy__c",
        closedCase.CaseReportingTaxonomy__c
      );
    }

    let ownerName = "";
    if (closedCase.OwnerId) {
      ownerName = await fetchRecordNameById("User", closedCase.OwnerId);
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${closedCase.CaseNumber}</td>
      <td>${productFeature}</td>
      <td>${new Date(closedCase.CreatedDate).toLocaleString()}</td>
      <td>${new Date(closedCase.ClosedDate).toLocaleString()}</td>
      <td>${ownerName}</td>
      <td>${closedCase.Status}</td>
    `;
    // set click listeners for the action buttons
    let currentStartIndQABtn = document.createElement("button");
    currentStartIndQABtn.innerHTML = "Start QA";
    currentStartIndQABtn.setAttribute(
      "id",
      `start-individual-qa-btn-${btnCounter}`
    );
    currentStartIndQABtn.classList.add("dynamic-btn");
    currentStartIndQABtn.style.display = "inline";
    currentStartIndQABtn.addEventListener("click", () => {
      currentlyAuditedCaseNumber = closedCase.CaseNumber;
      startQa(closedCase.Id, closedCase.CaseNumber, qaTableBody);
    });

    row.appendChild(currentStartIndQABtn);

    let currentMarkAsDoneBtn = document.createElement("button");
    currentMarkAsDoneBtn.innerHTML = "Mark As Done";
    currentMarkAsDoneBtn.setAttribute(
      "id",
      `mark-as-done-individual-btn-${btnCounter}`
    );
    currentMarkAsDoneBtn.classList.add("dynamic-btn");
    currentMarkAsDoneBtn.style.display = "inline";
    currentMarkAsDoneBtn.addEventListener("click", () => {
      markAsDone(
        currentStartIndQABtn,
        currentMarkAsDoneBtn,
        closedCase.Id,
        closedCase.CaseNumber,
        currentlyAuditedCaseNumber
      );
    });


    row.appendChild(currentMarkAsDoneBtn);

    tableBody.appendChild(row);

    btnCounter++;
  }
  hideLoadingSpinner();
}

async function startQa(caseId, caseNumber, qaTableBody) {
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Creating Case Creation Record for Case -> ${caseNumber}`
  );
  showLoadingSpinner("QA Process: Creating Case Creation Record");

  const viewCaseMainBtn = document.getElementById("view-case-main-btn");
  viewCaseMainBtn.addEventListener("click", () => {
    window.open(`${ORG_CS_CASE_URL}${caseId}/view`, "_blank");
  });

  // const viewCaseDescBtn = document.getElementById("view-case-desc-main-btn");
  // viewCaseDescBtn.addEventListener("click", () => {
  //   fetchFieldFromRecord(["Description"], "Case", "Id", caseId).then(
  //     (result) => {
  //       if (result) {
  //         let caseDescription = result.Description;
  //         console.log(caseDescription);
  //         showComment(
  //           caseId,
  //           caseNumber,
  //           null,
  //           "caseDescription",
  //           1,
  //           caseDescription
  //         );
  //       }
  //     }
  //   );
  // });

  if (qaTableBody) {
    while (qaTableBody.firstChild) {
      qaTableBody.removeChild(qaTableBody.firstChild);
    }
  }
  console.log("Starting QA For -> ", caseNumber);

  // Start Case Creation Audit Process
  let auditCaseCreation = new Audit(
    caseId,
    caseNumber,
    AUDIT_TYPE_CASE_CREATION
  );
  let qaRecordCaseCreation = await createQaRecord(auditCaseCreation, null);

  console.log(
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CREATION}`,
    qaRecordCaseCreation
  );
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CREATION} -> ${qaRecordCaseCreation.toString()}`
  );

  let qaRecordListCaseCreation = [];
  qaRecordListCaseCreation.push(qaRecordCaseCreation);
  displayQAResults(caseId, caseNumber, qaRecordListCaseCreation);

  hideLoadingSpinner();

  // Start Case Updation Audit Process
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Creating Case Updation Record for Case -> ${caseNumber}`
  );
  let auditCaseUpdation = new Audit(caseId, caseNumber, AUDIT_TYPE_CASE_UPDATE);
  // console.log(auditCaseUpdation);
  // console.log(qaRecordCaseCreation);
  let qaRecordListCaseUpdation = await createQaRecord(
    auditCaseUpdation,
    qaRecordCaseCreation
  );
  // console.log(qaRecordListCaseUpdation);
  console.log(
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_UPDATE}`,
    qaRecordListCaseUpdation
  );
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_UPDATE} -> ${qaRecordListCaseUpdation.toString()}`
  );

  if (qaRecordListCaseUpdation.length == 0) {
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/info_60.png",
      "Success !!",
      "No updates posted on Case after Case Creation Update",
      []
    );
    Logger.logEvent(
      PROQA_PROCESS_NAME,
      `No updates posted on Case after Case Creation Update`
    );
  } else {
    displayQAResults(caseId, caseNumber, qaRecordListCaseUpdation);
    // console.log(caseId, caseNumber, qaRecordListCaseUpdation);
  }

  // Start Case Closure Audit Process
  // showLoadingSpinner("QA Process: Generating Case Closure Record", 5);
  // Logger.logEvent(PROQA_PROCESS_NAME, `Generating Case Closure Record`);
  // let auditCaseClosure = new Audit(caseId, caseNumber, AUDIT_TYPE_CASE_CLOSURE);
  // let qaRecordCaseClosure = await createQaRecord(
  //   auditCaseClosure,
  //   qaRecordCaseCreation
  // );
  // if (!qaRecordCaseClosure) {
  //   createBasicNotification(
  //     "../views/css/slds/assets/icons/utility/info_60.png",
  //     "Success !!",
  //     "No case closure record created",
  //     []
  //   );
  //   Logger.logEvent(
  //     PROQA_PROCESS_NAME,
  //     `No case closure record created for Case -> ${caseNumber}`
  //   );
  //   return;
  // }
  // console.log(
  //   `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CLOSURE}`,
  //   qaRecordCaseClosure
  // );
  // Logger.logEvent(
  //   PROQA_PROCESS_NAME,
  //   `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CLOSURE} -> ${qaRecordCaseClosure.toString()}`
  // );

  // let qaRecordListCaseClosure = [];
  // qaRecordListCaseClosure.push(qaRecordCaseClosure);
  // displayQAResults(caseId, caseNumber, qaRecordListCaseClosure);

  // hideLoadingSpinner();
}

async function displayQAResults(caseId, caseNumber, qaRecordList) {
  const qaTableDiv = document.getElementById("qa-table");
  qaTableDiv.style.display = "block";

  if (qaRecordList) {
    for (const qaRecord of qaRecordList) {
      if (qaRecord) {
        // console.log(qaRecord);
        const formattedOpenedDate = await formatDate(qaRecord.dateTimeOpened);
        const formattedClosedDate = await formatDate(qaRecord.dateTimeClosed);
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${formattedOpenedDate}</td>
        <td>${formattedClosedDate}</td>
        <td>${qaRecord.caseNumber}</td>
        <td>${qaRecord.caseUpdatedBy}</td>
        <td>${qaRecord.alertName}</td>
        <td>${qaRecord.orgId}</td>
        <td>${qaRecord.subject}</td>
        <td>${qaRecord.typeOfCaseUpdate}</td>
        <td>${qaRecord.hasAdditionalInfo}</td>
        <td>${qaRecord.internalComment}</td>
        <td>${qaRecord.isSlaMet}</td>
        <td>${qaRecord.isCaseStatusChanged}</td>
        <td>${qaRecord.alertMissedBy}</td>
        <td>${qaRecord.customerCommentMissedBy}</td>
        <td>${qaRecord.qaDoneBy}</td>
        <td>${qaRecord.qaDoneDate}</td>        
        `;

        // let viewCasebtn = document.createElement ('button');
        // viewCasebtn.innerHTML = 'View Case';
        // viewCasebtn.setAttribute ('id', `view-btn-${caseNumber}`);
        // viewCasebtn.classList.add ('dynamic-btn');
        // viewCasebtn.addEventListener ('click', () => {
        //   window.open (`${ORG_CS_CASE_URL}${caseId}/view`, '_blank');
        // });
        let userName = qaRecord.caseUpdatedBy;
        // console.log(qaRecord.commentContent);

        let viewCommentbtn = document.createElement("button");
        viewCommentbtn.innerHTML = "View Comment";
        viewCommentbtn.setAttribute("id", `view-comment-btn-${caseNumber}`);
        viewCommentbtn.classList.add("dynamic-btn");
        viewCommentbtn.addEventListener("click", () => {
          showComment(
            caseId,
            caseNumber,
            qaRecord,
            "public",
            null,
            qaRecord.commentContent
          );
        });

        let viewInternalCommentbtn = document.createElement("button");
        viewInternalCommentbtn.innerHTML = "View Internal Comment";
        viewInternalCommentbtn.setAttribute(
          "id",
          `view-internal-comment-btn-${caseNumber}`
        );
        viewInternalCommentbtn.classList.add("dynamic-btn");
        viewInternalCommentbtn.addEventListener("click", () => {
          showComment(
            caseId,
            caseNumber,
            qaRecord,
            "internal",
            3,
            qaRecord.commentContent
          );
        });
        

        // row.appendChild (viewCasebtn);
        row.appendChild(viewCommentbtn);
        row.appendChild(viewInternalCommentbtn);

        const tableBody = document.querySelector("#qa-table tbody");
        tableBody.appendChild(row);
      }
    };
  }
}

async function formatDate(dateString) {
  const [day, month, year] = dateString.split("/"); // Split by the slash ("/")
  
  // Ensure the month and day are two digits (e.g., 01, 02, ..., 09)
  const formattedDate = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
  
  return formattedDate;
}

// // Example usage:
// const formattedOpenedDate = formatDate(qaRecord.dateTimeOpened);
// const formattedClosedDate = formatDate(qaRecord.dateTimeClosed);

// // Now use these formatted dates in your HTML template
// const html = `
//   <td>${qaRecord.dateTimeOpened}</td>
//         <td>${qaRecord.dateTimeClosed}</td>
// `;

// console.log(html);


async function showComment(
  caseId,
  caseNumber,
  qaRecord,
  commentType,
  noOfComments,
  commentBody
) {
  let commentDetails = [];
  if (commentType == "internal" ) {
    let comments = await fetchCaseComments(
      caseId,
      commentType,
      qaRecord.caseUpdatedByUserid,  //Updated by Basha
      null,
      null,
      null
    );
    //
   // console.log(qaRecord.caseUpdatedByUserid);
    comments = comments.filter(comment => {
      return !comment.CommentBody.includes("Global Handover") && 
             !comment.CommentBody.includes("has been assigned to you.");


    });
    // console.log(comments);

  //   comments = comments.filter(comment => {
  //    return comment.CommentBody.includes("Internal") ||
  //          comment.CommentBody.includes("INTERNAL") || comment.CommentBody.includes("internal");

  //  });
   comments = comments.filter(comment => {
    return comment.CommentBody.toLowerCase().includes("internal");
});

    comments.forEach((comment) => {
      let commentDetail = {
        creator: qaRecord.caseUpdatedBy,
        caseNumber: caseNumber,
        commentText: comment.CommentBody,
        commentType: commentType === "internal" ? "Internal" : "Public",
      };
      commentDetails.push(commentDetail);
    });
  } 
  
  else if (commentType === "public") {
    let comments1 = await fetchCaseComments(
      caseId,
      commentType,
      qaRecord.caseUpdatedByUserid,  //Updated by Basha
      null,
      null,
      null
    );
    
   
    // comments1 = comments1.filter(comment => {
    //   return !comment.CommentBody.includes("The alert is now cleared.") &&
    //          !comment.CommentBody.includes("Next Steps: What do you need to do?");


    // });
    // console.log(comments1);

   // comments = comments1.filter(comment => {
    //  return comment.CommentBody.includes("Internal") ||
      //      comment.CommentBody.includes("INTERNAL");

  //  });
    comments1.forEach((comment) => {
      let commentDetail = {
        creator: qaRecord.caseUpdatedBy,
        caseNumber: caseNumber,
        commentText: comment.CommentBody,
        commentType: commentType === "internal" ? "Internal" : "Public",
      };
      commentDetails.push(commentDetail);
    });
  } 
  // console.log(commentDetails);

  const commentJson = JSON.stringify(commentDetails);
  const encodedJson = encodeURIComponent(commentJson);

  window.open("../views/displayComment.html?comment=" + encodedJson);
}








async function markAsDone(
  startQaBtn,
  markAsDoneBtn,
  caseId,
  caseNumber,
  currentlyAuditedCaseNumber
) {
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Posting internal hashtag on -> ${caseNumber} and marking as done`
  );
  if (caseNumber != currentlyAuditedCaseNumber) {
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error!!",
      `Cannot perform action for ${caseNumber}. Please complete the audit first`,
      []
    );
    console.log("error");
    return;
  }
  let result = await postInternalCommentOnAuditedCase(caseId);
  if (result.success) {
  // if(true){
    console.log("marked");
    const row = markAsDoneBtn.closest("tr");
    row.classList.add("highlight");
    markAsDoneBtn.remove();
    startQaBtn.remove();
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/info_60.png",
      "Success!!",
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`,
      []
    );
    Logger.logEvent(
      PROQA_PROCESS_NAME,
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`
    );
  } else {
    // console.log("result.fail");
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error occured !!",
      `Could not post internal comment - #ProMCaseAudited - on - ${caseNumber}`,
      []
    );
  }
}
async function markAsDone2(
  startQaBtn,
  markAsDoneBtn,
  caseId,
  caseNumber,
) {
  Logger.logEvent(
    PROQA_PROCESS_NAME,
    `Posting internal hashtag on -> ${caseNumber} and marking as done`
  );

  let result = await postInternalCommentOnAuditedCase(caseId);

  if (result.success) {
    console.log("Marked", caseNumber, "as done");

    // If you're doing a bulk operation, you can skip removing buttons but you might still want to highlight
    const row = document.querySelector(`tr[data-case-id='${caseId}']`);
    if (row) {
      row.classList.add("highlight");  // Add highlight to indicate success
    }

    createBasicNotification(
      "../views/css/slds/assets/icons/utility/info_60.png",
      "Success!!",
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`,
      []
    );

    Logger.logEvent(
      PROQA_PROCESS_NAME,
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`
    );
  } else {
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error occured !!",
      `Could not post internal comment - #ProMCaseAudited - on - ${caseNumber}`,
      []
    );
  }
}

// async function markAsDone(caseId, caseNumber) {
//   Logger.logEvent(
//     PROQA_PROCESS_NAME,
//     `Posting internal hashtag on -> ${caseNumber} and marking as done`
//   );

//   // If you're using the same logic for auditing checks, you can implement a similar check as for Start QA
//   // For instance, you might compare the case number against the currently audited case number
//   // For simplicity, assuming no check is needed here.
  
//   let result = await postInternalCommentOnAuditedCase(caseId);

//   if (result.success) {
//     // Assuming each case row has a "mark as done" button that gets removed once done
//     // You might need to reference your case rows for this if you're updating the UI
//     const row = document.querySelector(`tr[data-case-id='${caseId}']`);
//     if (row) {
//       const markAsDoneBtn = row.querySelector(".mark-as-done-btn");
//       const startQaBtn = row.querySelector(".start-qa-btn");

//       if (markAsDoneBtn) {
//         markAsDoneBtn.remove();  // Remove the "Mark as Done" button
//       }
//       if (startQaBtn) {
//         startQaBtn.remove();  // Remove the "Start QA" button
//       }

//       // You can add a highlight class if needed
//       row.classList.add("highlight");

//       createBasicNotification(
//         "../views/css/slds/assets/icons/utility/info_60.png",
//         "Success!!",
//         `Marked ${caseNumber} as Audited. #ProMCaseAudited`,
//         []
//       );
//       Logger.logEvent(
//         PROQA_PROCESS_NAME,
//         `Marked ${caseNumber} as Audited. #ProMCaseAudited`
//       );
//     }
//   } else {
//     createBasicNotification(
//       "../views/css/slds/assets/icons/utility/error.svg",
//       "Error occured !!",
//       `Could not post internal comment - #ProMCaseAudited - on - ${caseNumber}`,
//       []
//     );
//   }
// }

// async function filterClosedCases(closedCases) {
//   let filteredList = [];
//   for (let i = 0; i < closedCases.length; i++) {
//     const cCase = closedCases[i];
//     const lastInternalComment = await fetchCaseComments(
//       cCase.Id,
//       "internal",
//       null,
//       cCase.ClosedDate,
//       null,
//       1,
//       "CreatedDate",
//       "DESC"
//     );
//     // if (!lastInternalComment.includes(PROM_CASE_AUDITED_TAG)) {
//     //   filteredList.push(cCase);
//     // }
//     // if (Array.isArray(lastInternalComment) && lastInternalComment.length > 0) {
//     //   const firstComment = lastInternalComment[0];

//     //   // Log the CommentBody of the first comment
//     //   console.log("CommentBody:", firstComment.CommentBody);

//     //   // Check if the CommentBody does NOT contain "#ProMCaseAudited"
//     //   if (firstComment.CommentBody && !firstComment.CommentBody.includes("#ProMCaseAudited")) {
//     //     // If the comment body does NOT contain the tag, push the case into the filtered list
//     //     filteredList.push(cCase);
//     //     console.log("inside");
//     //   }
//     // }
//     let lt = "";
//     if (Array.isArray(lastInternalComment)) {
//       if (lastInternalComment.length > 0 && lastInternalComment[0].CommentBody) {
//         lt = lastInternalComment[0].CommentBody;
//       }
      
//       if (lt != "#ProMCaseAudited") {
//         filteredList.push(cCase);
//         // console.log(lt);
//         // console.log("pushed");
//       }
//     }
//   }
//   return filteredList;
// }
async function filterClosedCases(closedCases, limit) {
  let j = 0;
  let filteredList = [];
  
  for (let i = 0; i < closedCases.length; i++) {
    const cCase = closedCases[i];

    // Fetch comments for the current case
    const lastInternalComment = await fetchCaseComments(
      cCase.Id,
      "internal",
      null,
      cCase.ClosedDate,
      null,
      1,
      "CreatedDate",
      "DESC"
    );

    let lt = "";
    if (Array.isArray(lastInternalComment) && lastInternalComment.length > 0) {
      lt = lastInternalComment[0].CommentBody || "";
    }

    // If the comment does not contain the "#ProMCaseAudited" tag, add it to the filtered list
    if (lt !== "#ProcessImprovement" && lt !== "#ProMCaseAudited" ) {
      filteredList.push(cCase);
      j++;

      // Exit the loop if we've reached the limit
      if (j >= limit) {
        break;
      }
    }
  }

  return filteredList;
}
