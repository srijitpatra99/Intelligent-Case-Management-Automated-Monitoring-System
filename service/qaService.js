import {
  fetchAuditedCaseData,
  fetchCaseComments,
  fetchCustComment,
  fetchRecordNameById,
  fetchUserFieldFromUserId,
  fetchCaseHistory,
} from './salesforceService.js';
import {
  AUDIT_TYPE_CASE_CREATION,
  AUDIT_TYPE_CASE_UPDATE,
  AUDIT_TYPE_CASE_CLOSURE,
  GADGET_TEAM_USER_ID,
  PROM_CASE_CLOSURE_TAGS,
  PROQA_PROCESS_NAME,
} from '../utils/constants.js';
import {createBasicNotification} from './notificationService.js';
import {QualityAnalysis} from '../models/qualityAnalysis.js';
import {getCurrentAuthContext} from '../utils/auth.js';
import {
  extractClosureTagnamesFromComment,
  extractDataFromCaseHistory,
  hideLoadingSpinner,
  showLoadingSpinner,
 // hideBulkLoadingSpinner,
 // showBulkLoadingSpinner,
  testIfInitialComment,
} from '../utils/commonUtils.js';
import {CaseOwnershipChange} from '../models/CaseOwnershipChange.js';
import Logger from '../utils/Logger.js';

export async function createQaRecord (audit, qaRecordPreviousStep) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Creating QA Record. Type -> ${audit.auditType}. CaseNumber -> ${audit.caseNumber}`
  );
  let qaRecord;
  if (audit.auditType == AUDIT_TYPE_CASE_CREATION) {
    qaRecord = startCaseCreationAuditProcess (audit.caseId);
  } else if (audit.auditType == AUDIT_TYPE_CASE_UPDATE) {
    // qaRecord = startCaseUpdateAuditProcess (audit.caseId, qaRecordPreviousStep);}
    qaRecord = CaseUpdateProcess(audit.caseId);}
  // } else if (audit.auditType == AUDIT_TYPE_CASE_CLOSURE) {
  //   qaRecord = startCaseClosureAuditProcess (
  //     audit.caseId,
  //     qaRecordPreviousStep
  //   );
  // }
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Generated QA Record. Type -> ${audit.auditType}. CaseNumber -> ${audit.caseNumber}`
  );
  return qaRecord;
}
// Case Creation Audit Step - methods
async function startCaseCreationAuditProcess (caseId) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Starting Case Creation Audit Process. CaseNumber -> ${caseId}`
  );
  let caseData = await fetchAuditedCaseData (caseId);
  if (!caseData) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching Audited Case Data for QA',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `Error occured while fetching Audited Case Data for QA. CaseId -> ${caseId}`
    );
    hideLoadingSpinner ();
    return;
  }

  let qa = new QualityAnalysis ();
  qa.dateTimeOpened = new Date (caseData.CreatedDate).toLocaleString ();
  qa.dateTimeClosed = new Date (caseData.ClosedDate).toLocaleString ();
  qa.caseNumber = caseData.CaseNumber;
  qa.orgId = caseData.Case_Origin_OrgID__c;
  qa.internalComment = " ";
  qa.subject = caseData.Subject;
  
  let alertName = await fetchRecordNameById (
    'CaseReportingTaxonomy__c',
    caseData.CaseReportingTaxonomy__c
  );
  if (!alertName) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching Alert Name for Case Creation QA Record',
      []
    );
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `Error occured while fetching Alert Name for Case Creation QA Record. CaseId -> ${caseId}`
    );
    hideLoadingSpinner ();
    return;
  }
  qa.alertName = alertName;
  qa.typeOfCaseUpdate = AUDIT_TYPE_CASE_CREATION;

  let caseHistoryData = await fetchCaseHistory (caseId);
  let firstPublicComment = await fetchCaseComments (
    caseId,
    'public',
    null,
    null,
    null,
    1,
    null,
    null
  );
  if (firstPublicComment.length == 0) {
    console.log (
      'Cant fetch first public comment for case -> ',
      caseData.CaseNumber
    );
  }

  let caseUpdatedById;
  if (firstPublicComment.length != 0) {
    caseUpdatedById = firstPublicComment[0].CreatedById;
  }

  let firstCaseOwnerElement=extractDataFromCaseHistory(caseHistoryData,'Owner','00G3y000004PHp0EAG');
  // console.log('This is for test',firstCaseOwnerElement.NewValue);
  caseUpdatedById=firstCaseOwnerElement.NewValue;

  if (!caseUpdatedById) {
    caseUpdatedById = extractDataFromCaseHistory (
      caseHistoryData,
      'Owner',
      null
    );
  }
  qa.firstOwner = caseUpdatedById;

  let userName = await fetchUserFieldFromUserId (caseUpdatedById, 'Name');
  if (!userName || userName.length == 0) {
    console.log (
      'Cant fetch first public comment user for case -> ',
      qa.caseNumber
    );
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching Audited Case Data for QA',
      []
    );
    hideLoadingSpinner ();
    return;
  }
  qa.caseUpdatedBy = userName;

  let emailId = await fetchUserFieldFromUserId (caseUpdatedById, 'Email');
  qa.emailId = emailId;

  let status = extractDataFromCaseHistory (caseHistoryData, 'Status');
  qa.isCaseStatusChanged = status;
  

  // if (
  //   caseData.Description.includes ('https://help.salesforce.com/') ||
  //   caseData.Description.includes (
  //     'https://help.salesforce.com/s/articleView?id='
  //   )
  // ) {
  //   qa.isCaseDescriptionUpdated = true;
  // } else {
  //   qa.isCaseDescriptionUpdated = false;
  // }

  let lastPublicActivityDatetime = extractDataFromCaseHistory (
    caseHistoryData,
    'Last_Public_Activity_Date_Time__c'
  );
  let dateAssignedToFirstUser=firstCaseOwnerElement.CreatedDate;
  // console.log(dateAssignedToFirstUser);
  let slaTime= await ifTePostedAnyComment(caseId,dateAssignedToFirstUser,30);      //updated by tarun   
  // console.log(slaTime);  
  if(slaTime==true)
    {
      qa.isSlaMet="Yes";
    }
  else{
      qa.isSlaMet="No";
    }

  let currentAuthContext = await getCurrentAuthContext ();
  let geo = currentAuthContext.geo;
  let email = currentAuthContext.email;
  let qaEngineerName = currentAuthContext.name;
  let qaDoneDate = new Date ();
  qa.caseUpdatedByUserid= caseUpdatedById;

  qa.geoName = geo.toUpperCase ();
  qa.qaDoneBy = qaEngineerName;
  qa.qaDoneDate = qaDoneDate.toLocaleDateString ();
  // qa.qaDoneMonth = qaDoneDate.getMonth () + 1;
  // qa.month = qaDoneDate.getMonth () + 1;

  // let day = qaDoneDate.getDate ();
  // let weekNumber = Math.ceil (day / 7);
  // qa.weekNumber = weekNumber - 1;
  // qa.qaDoneWeek = weekNumber;

  let vssp = extractDataFromCaseHistory (
    caseHistoryData,
    'IsVisibleInSelfService'
  );
  qa.isVisibleInSelfServicePortal = vssp;

  // Populate qa fields that are based on case comments like -> Additional Info Provided ? Internal Comment added ?
  // Fetching internal comments
  let caseComments = await fetchCaseComments (
    caseId,
    'internal',
    caseUpdatedById,
    null,
    null,
    5,
    null,
    null
  );

  // let isInternalCommentPresent = checkIfInternalCommentPresent (caseComments);
  // qa.isInternalCommentPresent = isInternalCommentPresent;

  // let isAlertMissed = await checkifAlertMissed (
  //   caseId,
  //   caseHistoryData,
  //   caseUpdatedById,
  //   qa.caseUpdatedBy
  // );
  // if (isAlertMissed) {
  //   qa.alertMissedBy = "Yes";
  // }
  // else{qa.alertMissedBy = "No";}
  if(slaTime==true){
    qa.alertMissedBy="No"
  }
  else{
    let isAlertMissed = await checkifAlertMissed (
      caseId,
      caseHistoryData,
      caseUpdatedById,
      qa.caseUpdatedBy,
      1
    );
    if (isAlertMissed) {
      qa.alertMissedBy = "Yes";
    }
    else{qa.alertMissedBy = "No";}
  }

  let isCustomerCommentMissed = await checkIfCustomerCommentMissed (
    caseData,
    caseHistoryData,
    caseUpdatedById
  );
  if (isCustomerCommentMissed) {
    qa.customerCommentMissedBy = "Yes";
  }else qa.customerCommentMissedBy = "No";

  qa.publicCommentCreatedById = caseUpdatedById;
  qa.internCommentCreatedById = caseUpdatedById;

  let nextOwner = extractDataFromCaseHistory (
    caseHistoryData,
    'Owner',
    caseUpdatedById
  );
  qa.nextOwner = nextOwner.NewValue;

  qa.commentContent = firstPublicComment[0].CommentBody;

  //setting unset properties of obj to empty string
  for (const key in qa) {
    if (
      qa[key] != null &&
      qa[key] != undefined &&
      typeof qa[key] === 'boolean' &&
      qa[key] == true
    ) {
      qa[key] = 'Yes';
    }
    if (
      qa[key] != null &&
      qa[key] != undefined &&
      typeof qa[key] === 'boolean' &&
      qa[key] == false
    ) {
      qa[key] = 'No';
    }
    if (qa[key] == null || qa[key] == undefined) {
      qa[key] = '';
    }
  }
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Completed Case Creation Audit Process. CaseNumber -> ${caseData.CaseNumber}`
  );
  // console.log(qa);
  return qa;
}

async function checkifAlertMissed (
  caseId,
  caseHistory,
  currentOwnerId,
  currentOwner
) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Checking if alert is missed. CaseId -> ${caseId}`
  );
  // get the time when alert was posted on case from gadget team -> t1

  let alertComment = await fetchCaseComments (
    caseId,
    'internal',
    GADGET_TEAM_USER_ID,
    null,
    null,
    1,
    null,
    null
  );
  if (
    alertComment == null ||
    alertComment == undefined ||
    alertComment.length == 0
  ) {
    console.log (
      'Cant fetch first alert comment posted by gadget for case -> ',
      caseId
    );
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while calcuting If Alert missed for QA',
      []
    );
    hideLoadingSpinner ();
    return;
  }
  let alertgeneratedTime = alertComment[0].CreatedDate;
  let alertgeneratedDatetime = new Date (alertgeneratedTime);

  // get the time when case owner was updated -> t2
  let ownerChangeInfo = extractDataFromCaseHistory (
    caseHistory,
    'Owner',
    currentOwner
  );
  console.log(ownerChangeInfo);
  if (!ownerChangeInfo) {
    console.log (
      'Cant fetch owner change info, to calculate alert missed by field. Please proceed with manual audit -> ',
      caseId
    );
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Cant fetch owner change info, to calculate alert missed by field. Please proceed with manual audit',
      []
    );
    hideLoadingSpinner ();
    return;
  }
  let ownerChangeTime = ownerChangeInfo.CreatedDate;
  let ownerChangeDatetime = new Date (ownerChangeTime);

  // if no public comment was posted during time duration t1 - t2 -> the alert was missed
  let publicCommentsPostedByCurrentOwner = await fetchCaseComments (
    caseId,
    'public',                                           
    currentOwnerId,
    alertgeneratedDatetime.toISOString (),
    ownerChangeDatetime.toISOString (),
    null,
    null,
    null
  );
  let internalCommentsPostedByCurrentOwner = await fetchCaseComments (
    caseId,
    'internal',                                           //changed from public to internal 
    currentOwnerId,
    alertgeneratedDatetime.toISOString (),
    ownerChangeDatetime.toISOString (),
    null,
    null,
    null
  );
  console.log(currentOwnerId);
  let internalComments=[]      //November 14
  for(let i in internalCommentsPostedByCurrentOwner)
  {
    let a = internalCommentsPostedByCurrentOwner[i].CommentBody;
    // console.log(a);
    if(!a.includes('Proactive Monitoring Global Handover') && !a.includes('has been assigned to you'))
    {
      internalComments.push(internalCommentsPostedByCurrentOwner[i]);
    }
  }
  // console.log(publicCommentsPostedByCurrentOwner);
  // console.log(internalComments);
  if (publicCommentsPostedByCurrentOwner.length == 0 && internalComments.length == 0) {
    // Alert is missed by TE
    return true;
  }
  return false;
}

async function checkIfCustomerCommentMissed (
  caseData,
  caseHistory,
  currentOwnerId
) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Checking if customer comment is missed. CaseNumber -> ${caseData.CaseNumber}`
  );
  // calculate the case creation time and case handover time
  let caseCreatedTime = caseData.CreatedDate;
  let fromTime = new Date (caseCreatedTime);

  let caseHandoverData = extractDataFromCaseHistory (
    caseHistory,
    'Owner',
    currentOwnerId
  );
  let caseHandoverTime = caseHandoverData.CreatedDate;
  let toTime = new Date (caseHandoverTime);

  // fetch customer comment on the case in between these 2 time range
  let custComment = await fetchCustComment (
    caseData.Id,
    currentOwnerId,
    fromTime.toISOString (),
    toTime.toISOString ()
  );

  if (custComment === null || custComment === undefined) {
    console.log (
      'Cant fetch customer comment posted by gadget for case -> ',
      caseData.CaseNumber
    );
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while calcuting If customer comment missed for QA',
      []
    );
    hideLoadingSpinner ();
    return;
  }

  if (custComment.length == 0) {
    return false;
  }
  // if we reach this time point it means there is a customer comment between case creation time and case handover time. Now we check the if there is a public comment by the current owner in this timeframe
  let publicCommentByOwnner = await fetchCaseComments (
    caseData.Id,
    'public',
    currentOwnerId,
    fromTime.toISOString (),
    toTime.toISOString (),
    null,
    null,
    null
  );
  // if no public comment created by currentOwner, return true, i.e TE missed the cust comment, else return false
  if (publicCommentByOwnner && publicCommentByOwnner.length > 0) {
    return true;
  } else {
    return false;
  }
}

//CASE UPDATE PROCESS



async function CaseUpdateProcess(caseId)
{
  showLoadingSpinner (
    'QA Process: Creating Case Updation Records'
  );
  let currentAuthContext = await getCurrentAuthContext();
  let qaRecords=[];
  let qaEngineerName = currentAuthContext.name;
  let qaDoneDate = new Date ();
  let caseData = await fetchAuditedCaseData (caseId);
  let caseHistory = await fetchCaseHistory (caseId);
  let allOwnersData=await getAllOwners(caseHistory);
  let alertName = await fetchRecordNameById (
    'CaseReportingTaxonomy__c',
    caseData.CaseReportingTaxonomy__c
  );
  for(let i=0 ; i<allOwnersData.length-1 ; i++)
    {
      let userId = allOwnersData[i].NewValue ;  //updated by Basha
      let userName=await fetchUserFieldFromUserId(allOwnersData[i].NewValue,'Name');
       let uniqueCases=await getUniqueAlerts(caseId,allOwnersData[i].CreatedDate,allOwnersData[i+1].CreatedDate);
       let nextChange=allOwnersData[i+1].CreatedDate;
       if(uniqueCases.length>0)
      {
        //console.log('For the user',userName);
        for(let i in uniqueCases)
        {
           let qa = new QualityAnalysis();
           qa.qaDoneBy=qaEngineerName;
           qa.alertName=alertName;
           qa.qaDoneDate=qaDoneDate.toLocaleDateString();
           qa.hasAdditionalInfo=' ';
           qa.internalComment=' ';
           qa.dateTimeOpened = new Date (caseData.CreatedDate).toLocaleString ();
           qa.dateTimeClosed = new Date (caseData.ClosedDate).toLocaleString ();
           qa.caseNumber = caseData.CaseNumber;
           qa.orgId = caseData.Case_Origin_OrgID__c;
           qa.caseUpdatedBy=userName;
           qa.caseUpdatedByUserid= userId; //updated by Basha 495
           qa.subject = caseData.Subject;
           qa.typeOfCaseUpdate = AUDIT_TYPE_CASE_UPDATE;
           let CaseStatusChanged = extractDataFromCaseHistory (caseHistory, 'Status');
           if(CaseStatusChanged==true)
            {
             qa.isCaseStatusChanged='Yes'
            }
            else
            {
             qa.isCaseStatusChanged='No'
            }
 
           let SlaMet=await ifTePostedAnyComment(caseId,uniqueCases[i].CreatedDate,30);
           if(SlaMet==true)
           {
            qa.isSlaMet='Yes'
           }
           else
           {
            qa.isSlaMet='No'
           }

          //  let alertMissed= await ifAlertMissed(caseId,uniqueCases[i].CreatedDate,nextChange);
          // //  console.log(caseId,caseHistory,allOwnersData[i].NewValue,userName);
          // console.log(userName);
          //  console.log(alertMissed);
          //  if(alertMissed==true)
          //   {
          //    qa.alertMissedBy='Yes'
          //   }
          //   else
          //   {
          //     qa.alertMissedBy='No'
          //   }
          if(SlaMet==true){
            qa.alertMissedBy='No'}
           else{
            let alertMissed= await ifAlertMissed(caseId,uniqueCases[i].CreatedDate,nextChange)
            //  console.log(uniqueCases[i][0]);
            //  let alertMissed=await checkifAlertMissed(caseId,caseHistory,allOwnersData[i].NewValue,userName,null);  //November 14
            //  console.log(alertMissed);
             if(alertMissed==true)
              {
               qa.alertMissedBy='Yes'
              }
              else
              {
                qa.alertMissedBy='No'
              }
            }
           let customerCommentMissed=await checkIfCustomerCommentMissed(caseData,caseHistory,allOwnersData[i].NewValue);
           if(customerCommentMissed==true)
            {
             qa.customerCommentMissedBy='Yes'
            }
            else
            {
              qa.customerCommentMissedBy='No'
            }

           qaRecords.push(qa);
        }
      }
    }
    hideLoadingSpinner();
    return qaRecords;
}

async function getAllOwners(caseHistory) {
  let getOwnersData =[]
  for(let i in caseHistory)
  {
    if(caseHistory[i].Field=='Owner'&&  caseHistory[i].OldValue && caseHistory[i].OldValue.startsWith('005') && caseHistory[i].NewValue && caseHistory[i].NewValue.startsWith('005') && caseHistory[i].OldValue!='00G3y000004PHp0EAG')
    {
      getOwnersData.push(caseHistory[i]);
    }
  }
  return getOwnersData;
}

async function getUniqueAlerts(caseId,start,end) {
  let alertsDuringOwnership = await fetchCaseComments (
    caseId,
    'internal',
    GADGET_TEAM_USER_ID,
    start,
    end,
    null,
    null,
    null
  );
  let data=[];

  let exhausted=null;
  let critical=null;

if(alertsDuringOwnership!=null && alertsDuringOwnership.length>0 && alertsDuringOwnership!=undefined)
{
for(const i in alertsDuringOwnership)
{
  let comment=alertsDuringOwnership[i];
  if (comment.CommentBody.includes('CRITICAL') && critical==null) {
  critical=comment;
    data.push(comment);
}
  else if (comment.CommentBody.includes ('EXHAUSTED') && exhausted==null) {
  exhausted=comment;
  data.push(comment);
  break; }
}
}
return data;
}












// Case Updation Audit Step - methods
async function startCaseUpdateAuditProcess (caseId, qaRecordPreviousStep) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Starting Case Updation Audit process. CaseNumber -> ${qaRecordPreviousStep.caseNumber}`
  );
  let finalQaResults = [];
  // Fetch case data
  let caseData = await fetchAuditedCaseData (caseId);
  if (!caseData) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching Audited Case Data for QA',
      []
    );
    hideLoadingSpinner ();
    return;
  }
  // Fetch casehistory
  let caseHistory = await fetchCaseHistory (caseId);

  //fetch list of alert comments where current owner is @mentioned
  let alertCommentsOnCase = await fetchCaseComments (
    caseId,
    'internal',
    GADGET_TEAM_USER_ID,
    null,
    null,
    null,
    null,
    null
  );

  // Ignoring first alert as its covered in case creation QA
  alertCommentsOnCase.shift ();

  // Fetch case ownership change info
  let caseOwnershipChangeInfo = fetchCaseOwnershipChangeinfo (caseHistory);
  if (!caseOwnershipChangeInfo) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/error.svg',
      'Error occured !!',
      'Error occured while fetching case ownership data for QA. Please proceed with manual audit',
      []
    );
    hideLoadingSpinner ();
    return;
  }
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Started Auditiing ${caseOwnershipChangeInfo.length} ownership changes`
  );
  console.log (
    `Started Auditiing ${caseOwnershipChangeInfo.length} ownership changes`
  );

  showLoadingSpinner (
    'QA Process: Creating Case Updation Records'
  );

  for (let i = 0; i < caseOwnershipChangeInfo.length - 1; i++) {
    const currentOwner = caseOwnershipChangeInfo[i].newOwner;
    const caseOwnedAt = caseOwnershipChangeInfo[i].createdAt;
    const caseTransferredAt = caseOwnershipChangeInfo[i + 1].createdAt;
    const qaResults = await performCaseUpdateAudit (
      caseId,
      currentOwner,
      caseOwnedAt,
      caseTransferredAt,
      caseHistory,
      qaRecordPreviousStep
    );
    console.log(qaResults);
    if (qaResults && qaResults.length > 0) {
      finalQaResults = finalQaResults.concat (qaResults);
      // qaRecordPreviousStep = qaResults[qaResults.length - 1];
    }
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `Printing final QA Results List as of now -> ${finalQaResults.toString}`
    );
  }

  finalQaResults.forEach (qa => {
    // setting unset properties of obj to empty string
    for (const key in qa) {
      if (
        qa[key] != null &&
        qa[key] != undefined &&
        typeof qa[key] === 'boolean' &&
        qa[key] == true
      ) {
        qa[key] = 'Yes';
      }
      if (
        qa[key] != null &&
        qa[key] != undefined &&
        typeof qa[key] === 'boolean' &&
        qa[key] == false
      ) {
        qa[key] = 'No';
      }
      if (qa[key] == null || qa[key] == undefined) {
        qa[key] = '';
      }
    }
  });

  hideLoadingSpinner ();
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Completed Case Updation Audit process. CaseNumber -> ${qaRecordPreviousStep.caseNumber}`
  );
  return finalQaResults;
}

async function performCaseUpdateAudit (
  caseId,
  currentOwner,
  caseOwnedAt,
  caseTransferredAt,
  caseHistory,
  qaRecordPreviousStep
) {
  let qaResults = [];

  let teName = await fetchUserFieldFromUserId (currentOwner, 'Name');
  let teEmail = await fetchUserFieldFromUserId (currentOwner, 'Email');

  let alertsDuringOwnership = await fetchCaseComments (
    caseId,
    'internal',
    GADGET_TEAM_USER_ID,
    caseOwnedAt,
    caseTransferredAt,
    null,
    null,
    null
  );

  if (!alertsDuringOwnership || alertsDuringOwnership.length == 0) {
    Logger.logEvent (
      PROQA_PROCESS_NAME,
      `No alerts generated during ownership of -> ${teName} from -> ${caseOwnedAt} to -> ${caseTransferredAt}`
    );
    console.log (
      `No alerts generated during ownership of -> ${teName} from -> ${caseOwnedAt} to -> ${caseTransferredAt}`
    );
    return;
  }
  //  Filtering out CLEARED ALert comments
  alertsDuringOwnership = alertsDuringOwnership.filter (
    alert => !alert.CommentBody.startsWith ('[CLEARED]')
  );

  // Calculating if customer comment is missed
  let isCustomerCommentMissed = false;
  let numberOfUnqiueAlerts = calculateUniqueAlerts (alertsDuringOwnership);

  // let customerUpdatesDuringOwnership = await fetchCaseComments (
  //   caseId,
  //   'public',
  //   currentOwner,
  //   caseOwnedAt,
  //   caseTransferredAt,
  //   null,
  //   null,
  //   null
  // );
  let customerCommentsDuringOwnership = await fetchCustComment (
    caseId,
    currentOwner,
    caseOwnedAt,
    caseTransferredAt
  );
  for (let i = 0; i < customerCommentsDuringOwnership.length; i++) {
    const customerComment = customerCommentsDuringOwnership[i];
    const replyByTE = await fetchCaseComments (
      caseId,
      'public',
      currentOwner,
      customerComment.CreatedDate,
      caseTransferredAt,
      null,
      'CreatedDate',
      'ASC'
    );
    if (!replyByTE || !replyByTE.length > 0) {
      isCustomerCommentMissed = true;
      let qaResult = new QualityAnalysis ();
      qaResult.isCustomerCommentMissed = true;
      qaResult.customerCommentMissedBy = teName;
      return;
    }
  }
  console.log(alertsDuringOwnership);

  for (let i = 0; i < alertsDuringOwnership.length; i++) {
    const currentAlert = alertsDuringOwnership[i];
    let nextAlert;
    if ((i = alertsDuringOwnership.length - 1)) {
      nextAlert = null;
    } else {
      nextAlert = alertsDuringOwnership[i + 1];
    }
    const alertAuditResult = await auditAlert (
      caseId,
      currentOwner,
      teName,
      teEmail,
      caseOwnedAt,
      caseTransferredAt,
      currentAlert,
      nextAlert,
      caseHistory,
      qaRecordPreviousStep
    );
    // console.log(caseId,
    //   currentOwner,
    //   teName,
    //   teEmail,
    //   caseOwnedAt,
    //   caseTransferredAt,
    //   currentAlert,
    //   nextAlert);
    //   console.log(
    //   caseHistory,
    //   qaRecordPreviousStep);
    // console.log(alertAuditResult);
    qaResults.push(alertAuditResult);
  }
  return qaResults;
}


async function auditAlert (
  caseId,
  currentOwner,
  teName,
  teEmail,
  caseOwnedAt,
  caseTransferredAt,
  alert,
  nextAlert,
  caseHistory,
  qaRecordPreviousStep
) {
  let currentAlertCreatedTime = alert.CreatedDate;
  let nextAlertCreatedTime;
  if (nextAlert) {
    nextAlertCreatedTime = nextAlert.CreatedDate;
  } else {
    nextAlertCreatedTime = caseTransferredAt;
  }

  //calculate public comment posted by TE between alert created time and next alert created time
  let publicCommentsAfterAlert = await fetchCaseComments (
    caseId,
    'public',
    currentOwner,
    currentAlertCreatedTime,
    nextAlertCreatedTime,
    null,
    'CreatedDate',
    'ASC'
  );
  if (!publicCommentsAfterAlert) {
    createBasicNotification (
      '../views/css/slds/assets/icons/utility/info.svg',
      'Info',
      `Couldn't fetch public comments posted by ${currentOwner} after alert generated at ${currentAlertCreatedTime}. Skipping.`,
      []
    );
    return;
  }
  if (publicCommentsAfterAlert.length == 0) {
    let qa = new QualityAnalysis ();
    let teName = await fetchUserFieldFromUserId (currentOwner, 'Name');
    qa.alertMissedBy = teName;
    return;
  }
  let analysisComment;
  let initialComment;

  for (let i = 0; i < publicCommentsAfterAlert.length; i++) {
    const publicComment = publicCommentsAfterAlert[i];
    if (!testIfInitialComment (publicComment.CommentBody)) {
      analysisComment = publicComment;
    } else {
      initialComment = publicComment;
    }
  }

  // let internalComments = await fetchCaseComments (
  //   caseId,
  //   'internal',
  //   currentOwner,
  //   currentAlertCreatedTime,
  //   nextAlertCreatedTime
  // );
  let isVSSPDoneByCurrentOwner;
  if (!qaRecordPreviousStep.isVisibleInSelfServicePortal) {
    isVSSPDoneByCurrentOwner = extractDataFromCaseHistory (
      caseHistory,
      'IsVisibleInSelfService',
      false
    );
  }

  let qa = new QualityAnalysis ();
  qa.dateTimeOpened = qaRecordPreviousStep.dateTimeOpened;
  qa.dateTimeClosed = qaRecordPreviousStep.dateTimeClosed;
  qa.caseNumber = qaRecordPreviousStep.caseNumber;
  qa.alertName = qaRecordPreviousStep.alertName;
  qa.typeOfCaseUpdate = AUDIT_TYPE_CASE_UPDATE;
  qa.caseUpdatedBy = teName;
  qa.emailId = teEmail;
  // qa.isInternalCommentPresent = checkIfInternalCommentPresent (
  //   internalComments
  // );
  qa.isCaseStatusChanged = extractDataFromCaseHistory (caseHistory, 'Status');
  qa.isVisibleInSelfServicePortal = isVSSPDoneByCurrentOwner
    ? isVSSPDoneByCurrentOwner
    : '';
  qa.geoName = qaRecordPreviousStep.geoName;

  qa.orgId = qaRecordPreviousStep.orgId;
  qa.internalComment = " ";
  qa.subject = qaRecordPreviousStep.subject;
  // let caseHistoryData = await fetchCaseHistory (caseId);
  // let isAlertMissed = await checkifAlertMissed (
  //   caseId,
  //   caseHistoryData,
  //   caseUpdatedById,
  //   qa.caseUpdatedBy
  // );
  // if (isAlertMissed) {
  //   qa.alertMissedBy = "Yes";
  // }
  // else{qa.alertMissedBy = "No";}

  // let isCustomerCommentMissed = await checkIfCustomerCommentMissed (
  //   caseData,
  //   caseHistoryData,
  //   caseUpdatedById
  // );
  // if (isCustomerCommentMissed) {
  //   qa.customerCommentMissedBy = "Yes";
  // }else qa.customerCommentMissedBy = "No";

  qa.qaDoneBy = qaRecordPreviousStep.qaDoneBy;
  qa.qaDoneDate = qaRecordPreviousStep.qaDoneDate;
  // qa.month = qaRecordPreviousStep.month;
  // qa.weekNumber = qaRecordPreviousStep.weekNumber;
  // qa.qaDoneMonth = qaRecordPreviousStep.qaDoneMonth;
  // qa.qaDoneWeek = qaRecordPreviousStep.qaDoneWeek;
 
  qa.isSlaMet = await ifTePostedAnyComment(caseId,currentAlertCreatedTime,30);

  let caseData = await fetchAuditedCaseData (caseId);
  let checkAlertMiss=await checkifAlertMissed(caseId,caseHistory,currentOwner,teName);  //Updated by Tarun
  let isCustomerCommentMissed = await checkIfCustomerCommentMissed (caseData,caseHistory,currentOwner);
  if (isCustomerCommentMissed) {
    qa.customerCommentMissedBy = true;
  }
  else qa.customerCommentMissedBy = false;
  if(qa.customerCommentMissedBy){
    qa.customerCommentMissedBy="Yes";
  }else qa.customerCommentMissedBy = "No";

  if (checkAlertMiss) {
    qa.alertMissedBy = true;
  }
  else qa.alertMissedBy = false;
  if(qa.alertMissedBy){
    qa.alertMissedBy = "Yes";
  }
  else qa.alertMissedBy = "No";

  // if (!qa.isSlaMet) {
  //   qa.alertMissedBy = teName;
  // }

  qa.publicCommentCreatedById = currentOwner;
  return qa;
}

function fetchCaseOwnershipChangeinfo (caseHistory) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Fetching Ownership changes for this case...`
  );
  let ownershipChanges = [];
  let filteredOwnershipChanges = [];
  let finalOwnershipChanges = [];

  caseHistory.forEach (data => {
    if (
      data.Field == 'Owner' &&
      data.OldValue &&
      data.OldValue.startsWith ('005') &&
      data.NewValue &&
      data.NewValue.startsWith ('005')
    ) {
      let coc = new CaseOwnershipChange (
        data.CreatedDate,
        data.OldValue,
        data.NewValue
      );
      ownershipChanges.push (coc);
    }
  });
  return ownershipChanges;
}

function calculateUniqueAlerts (alertsComments) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Calculating no. of unique alerts generated during this ownership...`
  );
  let warnCount = 0;
  let critCount = 0;
  let exhaustCount = 0;
  alertsComments.forEach (comment => {
    if (comment.CommentBody.includes ('WARNING')) {
      warnCount++;
    } else if (comment.CommentBody.includes ('CRITICAL')) {
      critCount++;
    } else if (comment.CommentBody.includes ('EXHAUSTED')) {
      exhaustCount++;
    }
  });
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `${warnCount + critCount + exhaustCount} unique alerts generated during this ownership...`
  );
  return warnCount + critCount + exhaustCount;
}
// async function ifTePostedAnyComment(caseId,commentDate,sla)
// {
//   let startDate=new Date(commentDate);
//   let endDate = new Date(commentDate);
//   endDate=endDate.setMinutes(endDate.getMinutes()+sla);
//   endDate=new Date(endDate);
//   let start=formatDate(startDate);
//   let end=formatDate(endDate);
//   console.log(start);
//   console.log(end);
//   // console.log(start,'--->',end);
//   let isPublic= await isPublicPosted(caseId,start,end)
//   let isInternal= await isInternalPosted(caseId,start,end)
//   console.log(sla);
//   console.log(isPublic);
//   console.log(isInternal);
//   return isPublic||isInternal;
// }
async function ifTePostedAnyComment(caseId,commentDate,sla)
{
  let startDate=new Date(commentDate);
  let endDate = new Date(commentDate);
  startDate=startDate.setSeconds(startDate.getSeconds()+2);
  endDate=endDate.setMinutes(endDate.getMinutes()+sla);
  startDate=new Date(startDate);
  endDate=new Date(endDate);
  let start=formatDate(startDate);
  let end=formatDate(endDate);
  //  console.log(start,'--->',end);
  let isPublic= await isPublicPosted(caseId,start,end)
  let isInternal= await isInternalPosted(caseId,start,end)
  return isPublic||isInternal;
}
// 005Hx000001Q2FJIA0 - APE CCE Devils
// 0050M00000EyVfnQAF - HTIN Integration User
async function isPublicPosted(caseId,start,end)
{
  let publicComments = await fetchCaseComments (
    caseId,
    'public',
    null,
    start,
    end,
    null,
    null,
    null
  );
  for(let i in publicComments)
  {
    if (publicComments[i].CreatedById.startsWith('005') && publicComments[i].CreatedById!='005Hx000001Q2FJIA0' && publicComments[i].CreatedById!='0050M00000EyVfnQAF')
    {
      // console.log('Public posted at',publicComments[i].CreatedDate,await fetchUserFieldFromUserId(publicComments[i].CreatedById,'Name'));
      return true;
    }
  }
  return false;
}
async function isInternalPosted(caseId,start,end)
{
  let internalComments = await fetchCaseComments (
    caseId,
    'internal',
    null,
    start,
    end,
    null,
    null,
    null
  );
  for(let i in internalComments)
  {
    if (internalComments[i].CreatedById.startsWith('005') && internalComments[i].CreatedById!='005Hx000001Q2FJIA0' && internalComments[i].CreatedById!='0050M00000EyVfnQAF')
     { // console.log('Internal posted at',internalComments[i].CreatedDate,await fetchUserFieldFromUserId(internalComments[i].CreatedById,'Name'));;
      return true;} 
  }
  return false;
}
function formatDate(date)
{
  return date.toISOString();
}
// function slaCheckCaseUpdation (alert, updateByTE) {
//   Logger.logEvent (
//     PROQA_PROCESS_NAME,
//     `Checking if SLA is breached for this update...`
//   );
//   let alertCreatedTime = new Date (alert.CreatedDate);
//   let updateSentByTECreatedTime = new Date (updateByTE.CreatedDate);
//   if (updateSentByTECreatedTime - alertCreatedTime > 1800000) {
//     return false;
//   }
//   return true;
// }

// Case Closure Audit Step - methods
// async function startCaseClosureAuditProcess (caseId, qaRecordPreviousStep) {
//   Logger.logEvent (
//     PROQA_PROCESS_NAME,
//     `Started Case Closure Audit Process for Case -> ${qaRecordPreviousStep.caseNumber}`
//   );
//   // let isTagsPresent;
//   let isValidInternalClosureComment;
//   // Fetch case data
//   let caseData = await fetchAuditedCaseData (caseId);
//   if (!caseData) {
//     createBasicNotification (
//       '../views/css/slds/assets/icons/utility/error.svg',
//       'Error occured !!',
//       'Error occured while fetching Audited Case Data for QA',
//       []
//     );
//     Logger.logEvent (
//       PROQA_PROCESS_NAME,
//       `Error occured while fetching Audited Case Data for QA`
//     );
//     hideLoadingSpinner ();
//     return;
//   }
//   // fetch the current case owner (owner who closed)
//   let currentOwnerId = caseData.OwnerId;
//   // fetch public closure comment postedby current owner
//   let publicClosureComment = await fetchCaseComments (
//     caseId,
//     'public',
//     currentOwnerId,
//     null,
//     null,
//     1,
//     'CreatedDate',
//     'DESC'
//   );
//   if (publicClosureComment && publicClosureComment.length == 1) {
//     publicClosureComment = publicClosureComment[0].CommentBody;
//   }

//   // fetch internal closure comment postedby current owner
//   let internalClosureComment = await fetchCaseComments (
//     caseId,
//     'internal',
//     currentOwnerId,
//     null,
//     null,
//     1,
//     'CreatedDate',
//     'DESC'
//   );
//   if (!internalClosureComment) {
//     createBasicNotification (
//       '../views/css/slds/assets/icons/utility/error.svg',
//       'Error occured !!',
//       'No internal comment Found. Please re-verify with manual audit',
//       []
//     );
//     hideLoadingSpinner ();
//     return;
//   }
//   if (internalClosureComment && internalClosureComment.length == 1) {
//     internalClosureComment = internalClosureComment[0].CommentBody;
//     // isTagsPresent = checkIfTagPresent (internalClosureComment);
//     isValidInternalClosureComment = checkIfValidClosureComment (
//       internalClosureComment,
//       'internal'
//     );
//   }

//   if (!isValidInternalClosureComment) {
//     createBasicNotification (
//       '../views/css/slds/assets/icons/utility/info_60.png',
//       'Info',
//       'No valid internal Closure Comment Found on case. Please re-verify with manual audit',
//       []
//     );
//     hideLoadingSpinner ();
//   }

//   let qa = new QualityAnalysis ();
//   qa.dateTimeOpened = qaRecordPreviousStep.dateTimeOpened;
//   qa.dateTimeClosed = qaRecordPreviousStep.dateTimeClosed;
//   qa.caseNumber = qaRecordPreviousStep.caseNumber;
//   qa.alertName = qaRecordPreviousStep.alertName;
//   qa.typeOfCaseUpdate = AUDIT_TYPE_CASE_CLOSURE;
//   qa.caseUpdatedBy = await fetchUserFieldFromUserId (currentOwnerId, 'Name');
//   qa.emailId = await fetchUserFieldFromUserId (currentOwnerId, 'Email');
//   // qa.isTagsPresent = isTagsPresent;
//   qa.isClosedStatusUpdated = caseData.Status == 'Closed' ? true : false;
//   // qa.tagName = extractClosureTagnamesFromComment (internalClosureComment);
//   qa.geoName = qaRecordPreviousStep.geoName;
//   qa.qaDoneBy = qaRecordPreviousStep.qaDoneBy;
//   qa.qaDoneDate = qaRecordPreviousStep.qaDoneDate;
//   // qa.month = qaRecordPreviousStep.month;
//   // qa.weekNumber = qaRecordPreviousStep.weekNumber;
//   // qa.qaDoneMonth = qaRecordPreviousStep.qaDoneMonth;
//   // qa.qaDoneWeek = qaRecordPreviousStep.qaDoneWeek;
//   qa.commentContent = publicClosureComment;
//   qa.publicCommentCreatedById = currentOwnerId;

//   //setting unset properties of obj to empty string
//   for (const key in qa) {
//     if (
//       qa[key] != null &&
//       qa[key] != undefined &&
//       typeof qa[key] === 'boolean' &&
//       qa[key] == true
//     ) {
//       qa[key] = 'Yes';
//     }
//     if (
//       qa[key] != null &&
//       qa[key] != undefined &&
//       typeof qa[key] === 'boolean' &&
//       qa[key] == false
//     ) {
//       qa[key] = 'No';
//     }
//     if (qa[key] == null || qa[key] == undefined) {
//       qa[key] = '';
//     }
//   }
//   Logger.logEvent (
//     PROQA_PROCESS_NAME,
//     `Completed Case Closure Audit Process for Case -> ${qaRecordPreviousStep.caseNumber}`
//   );
//   return qa;
// }

// function checkIfValidClosureComment (comment, commentType) {
//   Logger.logEvent (
//     PROQA_PROCESS_NAME,
//     `Checking if Valid Closure Comment is posted...`
//   );
//   if (!comment) {
//     return false;
//   }
//   if (commentType == 'internal') {
//     if (comment.includes ('#PROMResolution') && comment.includes ('INTERNAL')) {
//       return true;
//     }
//   }
//   return false;
// }

async function isPublicPostedinGeo(caseId,start,end)
{
  let publicComments = await fetchCaseComments (
    caseId,
    'public',
    null,
    start,
    end,
    null,
    null,
    null
  );
  for(let i in publicComments)
  {
    if (publicComments[i].CreatedById.startsWith('005') && publicComments[i].CreatedById!='005Hx000001Q2FJIA0' && publicComments[i].CreatedById!='0050M00000EyVfnQAF' && publicComments.length>0)
    {
      console.log(publicComments[i]);
      return true;
    }
  }
  return false;
}
async function isInternalPostedinGeo(caseId,start,end)
{
  let internalComments = await fetchCaseComments (
    caseId,
    'internal',
    null,
    start,
    end,
    null,
    null,
    null
  );


  for(let i in internalComments)
  {
    if (internalComments[i].CreatedById.startsWith('005') && internalComments[i].CreatedById!='005Hx000001Q2FJIA0' && internalComments[i].CreatedById!='0050M00000EyVfnQAF')
     { 
      let comment = internalComments[i].CommentBody;
      if(!comment.includes('Proactive Monitoring Global Handover') && !comment.includes('has been assigned to you'))
      {
        // console.log(comment);
        return true;
      }
     } 
  }
  return false;
}

  async function ifAlertMissed(caseId,start,end){
    
    let internal=await isInternalPostedinGeo(caseId,start,end)
    let publicComment =  await isPublicPostedinGeo(caseId,start,end)
    let result=internal||publicComment
    console.log(internal,publicComment);
    return !result
  }



















///functions declared but not used :
function checkIfTagPresent (internalClosureComment) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Checking if closure tag is present on internal closure comment...`
  );
  if (!internalClosureComment) {
    return false;
  }
  let promTags = PROM_CASE_CLOSURE_TAGS;
  for (const tag of promTags) {
    if (internalClosureComment.includes (tag)) {
      return true;
    }
  }
  return false;
}

function checkIfInternalCommentPresent (caseComments) {
  Logger.logEvent (
    PROQA_PROCESS_NAME,
    `Checking if internal comment is present...`
  );
  let isInternalCommentPresent = false;
  caseComments.forEach (element => {
    if (
      element.CommentBody.includes ('INTERNAL') ||
      (element.CommentBody.includes (
        'https://gadget.prom.sfdc.sh/diagnostics/'
      ) ||
        element.CommentBody.includes (
          'https://splunk-web.log-analytics.monitoring.aws-esvc1-useast2.aws.sfdc.is/'
        ))
    ) {
      isInternalCommentPresent = true;
    }
  });

  return isInternalCommentPresent;
}

