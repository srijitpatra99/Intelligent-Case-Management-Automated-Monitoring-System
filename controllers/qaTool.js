// Please remember to import this js as a module in corresponding html file
let currentClosureList;
let currentlyAuditedCaseNumber;

import {
  copyTableToClipboard,
  getClosureBounds,
  getRandomNoOfElementsFromArray,
  showLoadingSpinner,
  hideLoadingSpinner,
  populateNavbarUserData,
} from '../utils/commonUtils.js';
import {
  QA_TEAM_EMAIL_IDS,
  PROM_CASE_AUDITED_TAG,
  AUDIT_TYPE_CASE_CREATION,
  ORG_CS_CASE_URL,
  AUDIT_TYPE_CASE_UPDATE,
  AUDIT_TYPE_CASE_CLOSURE,
  PROQA_PROCESS_NAME,
} from '../utils/constants.js';
import {
  getCurrentAuthContext,
  getSalesforceAuthContext,
} from '../utils/auth.js';
import {
  fetchCaseComments,
  fetchClosureCasesForQA,
  fetchFieldFromRecord,
  fetchRecordNameById,
  postInternalCommentOnAuditedCase,
} from '../service/salesforceService.js';
import {createBasicNotification} from '../service/notificationService.js';
import {Audit} from '../models/Audit.js';
import {createQaRecord} from '../service/qaService.js';
import Logger from '../utils/Logger.js';

document.addEventListener ('DOMContentLoaded', function () {
  populateNavbarUserData ();

  const qaTeamViewSection = document.getElementById ('qa-team-view');
  const nonQaTeamViewSection = document.getElementById ('non-qa-team-view');
  const fetchCasesForQaBtn = document.getElementById ('fetch-qa-cases-btn');
  const startBulkQaBtn = document.getElementById ('start-qa-btn');
  const tableBody = document.querySelector ('#closed-cases-table tbody');
  const ccTableDiv = document.getElementById ('cc-table');
  const qaTableDiv = document.getElementById ('qa-table');
  const qaTable = document.getElementById ('qa-results-table');
  const qaTableBody = document.querySelector ('#qa-table tbody');
  const clearBtn = document.getElementById ('clear-btn');
  const caseLimitDropdown = document.getElementById ('case-limit');
  const alertDropdown = document.getElementById ('alert-select');
  const teDropdown = document.getElementById ('te-select');
  const copyTableBtn = document.getElementById ('copy-table-btn');
  const downloadProcessLogsBtn = document.getElementById ('download-log-btn');
  const caseNumberInput = document.getElementById ('case-number');
  const dataEntrySectionDiv = document.getElementById ('data-entry-section');
  const spinner = document.getElementById ('my-spinner');
  spinner.style.display = 'none';

  let currentAuthContext;
  getCurrentAuthContext ().then (result => {
    Logger.logEvent (PROQA_PROCESS_NAME, 'Authorizing...');
    currentAuthContext = result;
    if (currentAuthContext != null) {
      let role = currentAuthContext.role;
      let emailId = currentAuthContext.email;

      if ((role == 'QA' || role == "Manager") && QA_TEAM_EMAIL_IDS.includes (emailId)) {
        nonQaTeamViewSection.style.display = 'None';
      } else {
        qaTeamViewSection.style.display = 'None';
      }
    }
    Logger.logEvent (PROQA_PROCESS_NAME, 'Authorization successfull');
  });

  ccTableDiv.style.display = 'None';
  qaTableDiv.style.display = 'None';
  clearBtn.style.display = 'None';
  startBulkQaBtn.style.display = 'None';

  fetchCasesForQaBtn.addEventListener ('click', () => {
    let caseNumber = caseNumberInput.value.trim ();
    if (caseNumber) {
      fetchFieldFromRecord (
        ['Id'],
        'Case',
        'CaseNumber',
        caseNumber
      ).then (result => {
        startQa (result.Id, caseNumber, null);
      });
    } else {
      fetchCasesForQaBtnHandler (
        tableBody,
        qaTableBody,
        caseLimitDropdown.value,
        alertDropdown.value,
        teDropdown.value
      );
      ccTableDiv.style.display = 'block';
      startBulkQaBtn.style.display = 'inline';
    }
    fetchCasesForQaBtn.style.display = 'None';
    clearBtn.style.display = 'inline';
    dataEntrySectionDiv.style.display = 'None';
  });

  clearBtn.addEventListener ('click', () => {
    while (tableBody.firstChild) {
      tableBody.removeChild (tableBody.firstChild);
    }
    clearBtn.style.display = 'None';
    ccTableDiv.style.display = 'None';
    qaTableDiv.style.display = 'None';
    caseLimitDropdown.value = '';
    alertDropdown.value = '';
    teDropdown.value = '';
    fetchCasesForQaBtn.style.display = 'inline';
    startBulkQaBtn.style.display = 'None';
    this.location.reload ();
  });

  startBulkQaBtn.addEventListener ('click', () => {
    // for (const closedCase of currentClosureList) {
    //   startQa (closedCase.Id, closedCase.CaseNumber, qaTableBody);
    // }
  });

  copyTableBtn.addEventListener ('click', () => {
    copyTableToClipboard ('qa-results-table');
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/success.svg',
      'Success !!',
      'Copied QA Results to clipboard',
      []
    );
  });

  downloadProcessLogsBtn.addEventListener ('click', () => {
    Logger.downloadLogFile (PROQA_PROCESS_NAME);
  });
});

async function fetchCasesForQaBtnHandler (
  tableBody,
  qaTableBody,
  limit,
  alert,
  te
) {
  Logger.logEvent (PROQA_PROCESS_NAME, `Picking up ${limit} cases randomly`);
  if (!limit) {
    limit = 5;
  }
  showLoadingSpinner (`QA Process: Picking up ${limit} cases randomly`, limit);
  // if table already has some data
  while (tableBody.firstChild) {
    tableBody.removeChild (tableBody.firstChild);
  }

  let closedCases;
  let session = await getSalesforceAuthContext ();
  if (!session.orgcs) {
    // raise exception msg
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'OrgCS Session expired. Please re-login to OrgCS.',
      []
    );
    hideLoadingSpinner ();
    return;
  }

  let bounds = getClosureBounds ();
  if (!bounds) {
    // raise exception msg
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching Closure Bounds for QA',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `Error occured while fetching Closure Bounds for QA`
    );
    hideLoadingSpinner ();
    return;
  }
  if (!limit) {
    limit = 10;
  }

  closedCases = await fetchClosureCasesForQA (bounds, alert, te);

  Logger.logEvent (PROQA_PROCESS_NAME, `Randomizing closed cases...`);

  closedCases = getRandomNoOfElementsFromArray (closedCases, limit);
  currentClosureList = closedCases;

  if (closedCases == null || closedCases.length == 0) {
    // raise exception msg
    console.log ('Didnt fetch any closed cases');
    return;
  }
  // Removing cases having #ProMCaseAudited tag
  let unauditedClosedCases = await filterClosedCases (closedCases);
  if (!unauditedClosedCases) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error !!',
      'No audited case found in this random list. Please retry fetching cases',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `No audited case found in this random list. Please retry fetching cases`
    );
    hideLoadingSpinner ();
    return;
  }

  let btnCounter = 0;
  for (const closedCase of unauditedClosedCases) {
    let productFeature = '';
    if (closedCase.CaseReportingTaxonomy__c) {
      productFeature = await fetchRecordNameById (
        'CaseReportingTaxonomy__c',
        closedCase.CaseReportingTaxonomy__c
      );
    }

    let ownerName = '';
    if (closedCase.OwnerId) {
      ownerName = await fetchRecordNameById ('User', closedCase.OwnerId);
    }

    const row = document.createElement ('tr');
    row.innerHTML = `
      <td>${closedCase.CaseNumber}</td>
      <td>${productFeature}</td>
      <td>${new Date (closedCase.CreatedDate).toLocaleString ()}</td>
      <td>${new Date (closedCase.ClosedDate).toLocaleString ()}</td>
      <td>${ownerName}</td>
      <td>${closedCase.Status}</td>
    `;
    // set click listeners for the action buttons
    let currentStartIndQABtn = document.createElement ('button');
    currentStartIndQABtn.innerHTML = 'Start QA';
    currentStartIndQABtn.setAttribute (
      'id',
      `start-individual-qa-btn-${btnCounter}`
    );
    currentStartIndQABtn.classList.add ('dynamic-btn');
    currentStartIndQABtn.style.display = 'inline';
    currentStartIndQABtn.addEventListener ('click', () => {
      currentlyAuditedCaseNumber = closedCase.CaseNumber;
      startQa (closedCase.Id, closedCase.CaseNumber, qaTableBody);
    });

    row.appendChild (currentStartIndQABtn);

    let currentMarkAsDoneBtn = document.createElement ('button');
    currentMarkAsDoneBtn.innerHTML = 'Mark As Done';
    currentMarkAsDoneBtn.setAttribute (
      'id',
      `mark-as-done-individual-btn-${btnCounter}`
    );
    currentMarkAsDoneBtn.classList.add ('dynamic-btn');
    currentMarkAsDoneBtn.style.display = 'inline';
    currentMarkAsDoneBtn.addEventListener ('click', () => {
      markAsDone (
        currentStartIndQABtn,
        currentMarkAsDoneBtn,
        closedCase.Id,
        closedCase.CaseNumber,
        currentlyAuditedCaseNumber
      );
    });

    row.appendChild (currentMarkAsDoneBtn);

    tableBody.appendChild (row);

    btnCounter++;
  }
  hideLoadingSpinner ();
}

async function startQa (caseId, caseNumber, qaTableBody) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Creating Case Creation Record for Case -> ${caseNumber}`
  );
  showLoadingSpinner ('QA Process: Creating Case Creation Record', 7);

  const viewCaseMainBtn = document.getElementById ('view-case-main-btn');
  viewCaseMainBtn.addEventListener ('click', () => {
    window.open (`${ORG_CS_CASE_URL}${caseId}/view`, '_blank');
  });

  const viewCaseDescBtn = document.getElementById ('view-case-desc-main-btn');
  viewCaseDescBtn.addEventListener ('click', () => {
    fetchFieldFromRecord (
      ['Description'],
      'Case',
      'Id',
      caseId
    ).then (result => {
      if (result) {
        let caseDescription = result.Description;
        showComment (
          caseId,
          caseNumber,
          null,
          'caseDescription',
          1,
          caseDescription
        );
      }
    });
  });

  if (qaTableBody) {
    while (qaTableBody.firstChild) {
      qaTableBody.removeChild (qaTableBody.firstChild);
    }
  }
  console.log ('Starting QA For -> ', caseNumber);

  // Start Case Creation Audit Process
  let auditCaseCreation = new Audit (
    caseId,
    caseNumber,
    AUDIT_TYPE_CASE_CREATION
  );
  let qaRecordCaseCreation = await createQaRecord (auditCaseCreation, null);

  console.log (
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CREATION}`,
    qaRecordCaseCreation
  );
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CREATION} -> ${qaRecordCaseCreation.toString ()}`
  );

  let qaRecordListCaseCreation = [];
  qaRecordListCaseCreation.push (qaRecordCaseCreation);
  displayQAResults (caseId, caseNumber, qaRecordListCaseCreation);

  hideLoadingSpinner ();

  // Start Case Updation Audit Process
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Creating Case Updation Record for Case -> ${caseNumber}`
  );
  let auditCaseUpdation = new Audit (
    caseId,
    caseNumber,
    AUDIT_TYPE_CASE_UPDATE
  );
  let qaRecordListCaseUpdation = await createQaRecord (
    auditCaseUpdation,
    qaRecordCaseCreation
  );
  console.log (
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_UPDATE}`,
    qaRecordListCaseUpdation
  );
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_UPDATE} -> ${qaRecordListCaseUpdation.toString ()}`
  );

  if (qaRecordListCaseUpdation.length == 0) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/info_60.png',
      'Success !!',
      'No updates posted on Case after Case Creation Update',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `No updates posted on Case after Case Creation Update`
    );
  } else {
    displayQAResults (caseId, caseNumber, qaRecordListCaseUpdation);
  }

  // Start Case Closure Audit Process
  showLoadingSpinner ('QA Process: Generating Case Closure Record', 5);
  Logger.logEvent (PROQA_PROCESS_NAME, `Generating Case Closure Record`);
  let auditCaseClosure = new Audit (
    caseId,
    caseNumber,
    AUDIT_TYPE_CASE_CLOSURE
  );
  let qaRecordCaseClosure = await createQaRecord (
    auditCaseClosure,
    qaRecordCaseCreation
  );
  if (!qaRecordCaseClosure) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/info_60.png',
      'Success !!',
      'No case closure record created',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `No case closure record created for Case -> ${caseNumber}`
    );
    return;
  }
  console.log (
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CLOSURE}`,
    qaRecordCaseClosure
  );
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Generated QA Record Type -> ${AUDIT_TYPE_CASE_CLOSURE} -> ${qaRecordCaseClosure.toString ()}`
  );

  let qaRecordListCaseClosure = [];
  qaRecordListCaseClosure.push (qaRecordCaseClosure);
  displayQAResults (caseId, caseNumber, qaRecordListCaseClosure);

  hideLoadingSpinner ();
}

function displayQAResults (caseId, caseNumber, qaRecordList) {
  const qaTableDiv = document.getElementById ('qa-table');
  qaTableDiv.style.display = 'block';

  if (qaRecordList) {
    qaRecordList.forEach (qaRecord => {
      if (qaRecord) {
        const row = document.createElement ('tr');
        row.innerHTML = `
        <td>${qaRecord.dateTimeOpened}</td>
        <td>${qaRecord.dateTimeClosed}</td>
        <td>${qaRecord.caseNumber}</td>
        <td>${qaRecord.alertName}</td>
        <td>${qaRecord.typeOfCaseUpdate}</td>
        <td>${qaRecord.caseUpdatedBy}</td>
        <td>${qaRecord.emailId}</td>
        <td>${qaRecord.hasAdditionalInfo}</td>
        <td>${qaRecord.isSlaMet}</td>
        <td>${qaRecord.isEvaluationPeriodPresent}</td> 
        <td>${qaRecord.isCaseStatusChanged}</td>
        <td>${qaRecord.isCaseDescriptionUpdated}</td>
        <td>${qaRecord.isClosedStatusUpdated}</td>
        <td>${qaRecord.isVisibleInSelfServicePortal}</td>
        <td>${qaRecord.alertMissedBy}</td>
        <td>${qaRecord.customerCommentMissedBy}</td>
        <td>${qaRecord.geoName}</td>
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

        let viewCommentbtn = document.createElement ('button');
        viewCommentbtn.innerHTML = 'View Comment';
        viewCommentbtn.setAttribute ('id', `view-comment-btn-${caseNumber}`);
        viewCommentbtn.classList.add ('dynamic-btn');
        viewCommentbtn.addEventListener ('click', () => {
          showComment (
            caseId,
            caseNumber,
            qaRecord,
            'public',
            null,
            qaRecord.commentContent
          );
        });

        let viewInternalCommentbtn = document.createElement ('button');
        viewInternalCommentbtn.innerHTML = 'View Internal Comment';
        viewInternalCommentbtn.setAttribute (
          'id',
          `view-internal-comment-btn-${caseNumber}`
        );
        viewInternalCommentbtn.classList.add ('dynamic-btn');
        viewInternalCommentbtn.addEventListener ('click', () => {
          showComment (
            caseId,
            caseNumber,
            qaRecord,
            'internal',
            3,
            qaRecord.commentContent
          );
        });

        // row.appendChild (viewCasebtn);
        row.appendChild (viewCommentbtn);
        row.appendChild (viewInternalCommentbtn);

        const tableBody = document.querySelector ('#qa-table tbody');
        tableBody.appendChild (row);
      }
    });
  }
}

async function showComment (
  caseId,
  caseNumber,
  qaRecord,
  commentType,
  noOfComments,
  commentBody
) {
  let commentDetails = [];
  if (commentType == 'internal' || commentType == 'public') {
    let comments = await fetchCaseComments (
      caseId,
      commentType,
      qaRecord.publicCommentCreatedById,
      null,
      null,
      null
    );
    comments.forEach (comment => {
      let commentDetail = {
        creator: qaRecord.caseUpdatedBy,
        caseNumber: caseNumber,
        commentText: comment.CommentBody,
        commentType: commentType === 'internal' ? 'Internal' : 'Public',
      };
      commentDetails.push (commentDetail);
    });
  } else if (commentType === 'caseDescription') {
    let commentDetail = {
      creator: '',
      caseNumber: caseNumber,
      commentText: commentBody,
      commentType: 'Case Description',
    };
    commentDetails.push (commentDetail);
  }

  const commentJson = JSON.stringify (commentDetails);
  const encodedJson = encodeURIComponent (commentJson);

  window.open ('../views/displayComment.html?comment=' + encodedJson);
}

async function markAsDone (
  startQaBtn,
  markAsDoneBtn,
  caseId,
  caseNumber,
  currentlyAuditedCaseNumber
) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Posting internal hashtag on -> ${caseNumber} and marking as done`
  );
  if (caseNumber != currentlyAuditedCaseNumber) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error!!',
      `Cannot perform action for ${caseNumber}. Please complete the audit first`,
      []
    );
    return;
  }
  let result = await postInternalCommentOnAuditedCase (caseId);
  if (result.success) {
    const row = markAsDoneBtn.closest ('tr');
    row.classList.add ('highlight');
    markAsDoneBtn.remove ();
    startQaBtn.remove ();
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/info_60.png',
      'Success!!',
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`,
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `Marked ${caseNumber} as Audited. #ProMCaseAudited`
    );
  } else {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      `Could not post internal comment - #ProMCaseAudited - on - ${caseNumber}`,
      []
    );
  }
}

async function filterClosedCases (closedCases) {
  let filteredList = [];
  for (let i = 0; i < closedCases.length; i++) {
    const cCase = closedCases[i];
    const lastInternalComment = await fetchCaseComments (
      cCase.Id,
      'internal',
      null,
      cCase.ClosedDate,
      null,
      1,
      'CreatedDate',
      'DESC'
    );
    if (!lastInternalComment.includes (PROM_CASE_AUDITED_TAG)) {
      filteredList.push (cCase);
    }
  }
  return filteredList;
}
