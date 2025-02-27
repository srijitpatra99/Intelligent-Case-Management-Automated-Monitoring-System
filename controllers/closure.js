// Import required JS to current Path
import {
  getCurrentAuthContext,
  getSalesforceAuthContext,
} from "../utils/auth.js";
import { populateNavbarUserData } from "../utils/commonUtils.js";
import { createBasicNotification } from "../service/notificationService.js";
import {
  ORGCS_DOMAIN_NAME,
  memberIdMap,
  memberUserIdMap,
} from "../utils/constants.js";
import { getKeyFromStorage } from "../service/localStorage.js";
import {
  getLoggedInUserData,
  createConnection,
  fetchEMEAPresentTENames,
} from "../service/salesforceService.js";
let presentPROMEngineers = new Set();
let potentialClosureList = new Set();
let currentGEOoftheUser = "";
let parentIdOfCase = undefined;

var CaseList = [];
let totalCasesToBeClosed;

//DOM ContentLoad which will run at first once the html content is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Check Test");
  getKeyFromStorage("geo").then((res) => {
    console.log("geo>>>>", res);
    currentGEOoftheUser = res;
  });
  document.getElementById("getView").addEventListener("change", () => {
    document.getElementById("thId").innerHTML = "";
    document.getElementById("tbId").innerHTML = "";
    CaseList = [];
    document.getElementById("reAssignClosureDiv").style.display = "none";
  });
  document.getElementById("reAssignClosureDiv").style.display = "none";
  document.getElementById("my-spinner").style.display = "none";
  document.getElementById("dvTable").style.display = "none";

  document.getElementById("closureComments").style.display = "none";
  let currentAuthContext;
  populateNavbarUserData();
  document.getElementById("my-spinner").style.display = "none";
  getCurrentAuthContext().then((result) => {
    currentAuthContext = result;
    console.log("currentAuthContext>>>>", currentAuthContext);
    if (currentAuthContext != null) {
      let role = currentAuthContext.role;
      let emailId = currentAuthContext.email;
    }
  });
  let getCases = document.getElementById("getCases");
  getCases.addEventListener("click", function () {
    CaseList = [];
    document.getElementById("my-spinner").style.display = "block";
    document.getElementById("myInput").style.display = "none";

    console.log("Check data");
    let viewValue = document.getElementById("getView").value;
    if (viewValue == "selectView") {
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Uh-oh",
        "Please Select Manager view or TE view to get cases",
        []
      );
      document.getElementById("my-spinner").style.display = "none";
    } else getPendingCaseDetails();
  });
  document.getElementById("ccBtn").addEventListener("click", () => {
    document.getElementById("spinnerClosure").style.display = "block";
    if (typeof parentIdOfCase == "undefined") {
      document.getElementById("spinnerClosure").style.display = "none";
      document.getElementById("globalErrorDiv").style.display = "block";
      document.getElementById("globalErrorMsg").innerText =
        "Cases not found for closure";
      $("#globalErrorDiv").fadeOut(5000);
    } else {
      postCommentOnCase(
        document.getElementById("closureComment").value,
        parentIdOfCase
      );
    }
  });
  document.getElementById("icBtn").addEventListener("click", () => {
    document.getElementById("spinnerClosure").style.display = "block";
    if (typeof parentIdOfCase == "undefined") {
      document.getElementById("spinnerClosure").style.display = "none";
      document.getElementById("globalErrorDiv").style.display = "block";
      document.getElementById("globalErrorMsg").innerText =
        "Cases not found for closure";
      $("#globalErrorDiv").fadeOut(5000);
    } else
      postInternalCommentOnCase(
        document.getElementById("internalComment").value,
        parentIdOfCase
      );
  });
});

async function postCommentOnCase(finalClosureComment, caseId) {
  let conn = await createConnection();
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var url = tabs[0].url;
    console.log(finalClosureComment);

    //if(caseId!=null && finalClosureComment!==null){
    conn.sobject("CaseComment").create(
      {
        ParentId: caseId,
        CommentBody: finalClosureComment,
        IsPublished: true,
      },
      (err, res) => {
        if (err) {
          document.getElementById("errorDiv").style = "display:block";
          document.getElementById("errorMsg").innerText = err;
          console.error(err);
        }
        console.log(res);
        document.getElementById("spinnerClosure").style.display = "none";
        //document.getElementById("ta1").innerText = "";
        chrome.tabs.create({
          url:
            "https://orgcs.lightning.force.com/lightning/r/Case/" +
            caseId +
            "/view",
        });
      }
    );
  });
}

async function postInternalCommentOnCase(finalInternalComment, caseId) {
  let conn = await createConnection();
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var url = tabs[0].url;
    conn.sobject("CaseComment").create(
      {
        ParentId: caseId,
        CommentBody: finalInternalComment,
        IsPublished: false,
      },
      (err, res) => {
        if (err) {
          document.getElementById("errorDiv").style = "display:block";
          document.getElementById("errorMsg").innerText = err;
          return console.error(err);
        }
        console.log(res);
        document.getElementById("spinnerClosure").style.display = "none";
        //document.getElementById("ta2").innerText = "";
      }
    );
  });
}

async function getPendingCaseDetails() {
  let conn = await createConnection();
  let currentUserDetails = await getLoggedInUserData();
  console.log("Success>>>>", currentUserDetails);
  if (!currentUserDetails) {
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Error occured !!",
      "OrgCS Session expired. Please re-login to OrgCS.",
      []
    );
  } else {
    let strVar = "OwnerId ='" + currentUserDetails.user_id + "' AND ";
    //console.log('Check');
    //console.log('res.user_id>>>', res.user_id);
    //let strVar="OwnerId ='005Hx000001L4zJIAS' AND ";
    let view = document.getElementById("getView").value;
    if (view != "TEview") {
      strVar = " ";
    }
    console.log("strVar>>>>>", strVar);

    let CommentCreators =
      " AND (CreatedById ='0050M00000EyVfnQAF'" +
      " OR " +
      "CreatedById ='0050M00000FFDGAQA5') AND "; //HTIR Integration User && HTIR Integration User 2
    let currentlyLoggedInUser =
      "Parent.OwnerId ='" + currentUserDetails.user_id + "' AND ";
    if (view != "CustomerComment" && view != "InvestigationCases") {
      var BusinessHrsMap = new Map();
      var records = [];
      var caseIdsCheck = new Set();
      var query1 =
        "SELECT Owner.Name FROM Case WHERE ((Subject LIKE '[MCS MONITORING NOTIFICATION%') OR (Subject LIKE '[PROACTIVE MONITORING NOTIFICATION%')) AND CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND IsClosed=false GROUP BY Owner.Name ORDER BY Owner.Name";
      var query = conn
        .query(query1)
        .on("record", function (record) {
          if (memberIdMap.has(record.Name)) {
            presentPROMEngineers.add(record.Name);
          }
          //console.log('record>>>>', record);
        })
        .on("error", function (err) {
          console.log("Error in Scope 1>>>>", err);
          console.error(err);
        })
        .on("end", function () {
          console.log("presentPROMEngineers>>>>>>", presentPROMEngineers);
          var query2 =
            "Select Id, CaseNumber, (Select Id,CommentBody From CaseComments where CreatedDate=LAST_N_DAYS:2 AND (IsPublished=true OR CreatedById='005Hx000001Q2FJIA0') order by CreatedDate desc) From Case  WHERE IsClosed=false AND Age_days__c>1.5  AND " +
            strVar +
            " CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (subject LIKE '%PROACTIVE MONITORING NOTIFICATION%' OR subject LIKE '%MCS MONITORING NOTIFICATION%') AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','JP MCS') ORDER BY Parent.Last_Public_Activity_Date_Time__c";
          console.log("query2>>>" + query2);
          var query3 = "";
          var queryTemp = conn
            .query(query2)
            .on("record", function (record) {
              records.push(record);
            })
            .on("error", function (err) {
              console.log("Error in Scope 1>>>>", err);
              console.error(err);
            })
            .on("end", function () {
              //console.log('query 1>>>', query2);
              console.log(records);
              console.log("query length>>>", query2.length);
              var CaseId = "(";
              var flagCount = 0;
              console.log("records.length>>>>" + records.length);
              records.forEach((element) => {
                console.log(element.CaseComments);
                if (element.CaseComments === null) {
                  CaseId += "'" + element.Id + "',";
                  caseIdsCheck.add("'" + element.Id + "'");
                  flagCount++;
                  //console.log('element.Id>>',element.Id);
                }
              });
              console.log("flagCount>>", flagCount);
              if (CaseId.length > 2) {
                var mergedRecList = [];
                CaseId = CaseId.substring(0, CaseId.length - 1);
                CaseId += ")";
                console.log("query3 length>>>", query3.length);
                console.log("caseIdsCheck length>>>", caseIdsCheck.size);
                var caseList1 = [...caseIdsCheck].splice(
                  0,
                  caseIdsCheck.size / 2
                );
                //console.log('caseList1>>>', caseList1);
                var caseList2 = [...caseIdsCheck].splice(
                  caseIdsCheck.size / 2,
                  caseIdsCheck.size
                );
                //console.log('caseList2>>>', caseList2);
                query3 =
                  "SELECT Id, CaseNumber, AccountId, GUS_Investigation_Number__c, (SELECT Id, CommentBody, CreatedDate FROM CaseComments WHERE CreatedById='005Hx000001Q2FJIA0' ORDER BY CreatedDate DESC LIMIT 1) FROM Case WHERE Id IN (" +
                  [...caseList1].join(",") +
                  ")";
                var query4 = conn
                  .query(query3)
                  .on("record", function (record) {
                    //console.log('record>>>', record);
                    mergedRecList.push(record);
                  })
                  .on("end", function () {
                    query3 =
                      "SELECT Id, CaseNumber, AccountId, GUS_Investigation_Number__c, (SELECT Id, CommentBody, CreatedDate FROM CaseComments WHERE CreatedById='005Hx000001Q2FJIA0' ORDER BY CreatedDate DESC LIMIT 1) FROM Case WHERE Id IN (" +
                      [...caseList2].join(",") +
                      ")";
                    var query5 = conn
                      .query(query3)
                      .on("record", function (record2) {
                        //console.log('record>>>', record);
                        mergedRecList.push(record2);
                      })
                      .on("end", function () {
                        console.log(
                          "mergedRecList length>>>",
                          mergedRecList.length
                        );
                        var CaseId = "(";
                        var AccountId = "(";
                        console.log("execution completed");
                        mergedRecList.forEach((element) => {
                          if (
                            element.CaseComments != null &&
                            element.CaseComments.totalSize == 1 &&
                            (element.CaseComments.records[0].CommentBody.includes(
                              "Severity: OKAY"
                            ) ||
                              element.CaseComments.records[0].CommentBody.includes(
                                "Severity: OK"
                              ))
                          ) {
                            var businessHrs = workingMinsBetweenDates(
                              new Date(
                                element.CaseComments.records[0].CreatedDate
                              ),
                              new Date(),
                              true
                            );
                            var noOfSaturdays = getMinsOfSpecificDays(
                              new Date(
                                element.CaseComments.records[0].CreatedDate
                              ),
                              new Date(),
                              "Sat",
                              element.CaseNumber
                            );
                            var noOfMondays = getMinsOfSpecificDays(
                              new Date(
                                element.CaseComments.records[0].CreatedDate
                              ),
                              new Date(),
                              "Mon",
                              element.CaseNumber
                            );
                            var actualTime =
                              (businessHrs + noOfSaturdays - noOfMondays) / 60;
                            BusinessHrsMap.set(
                              element.Id,
                              actualTime.toFixed(2)
                            );
                            if (actualTime > 36) {
                              CaseId += "'" + element.Id + "',";
                              AccountId += "'" + element.AccountId + "',";
                            }
                          }
                        });
                        if (CaseId.length > 2) {
                          CaseId = CaseId.substring(0, CaseId.length - 1);
                          CaseId += ")";
                          AccountId = AccountId.substring(
                            0,
                            AccountId.length - 1
                          );
                          AccountId += ")";
                          //preparing map with key as caseId and value as customerComment // Modified by Imran on 27-05-2022---Start----
                          var caseCustComm = new Map();
                          conn.query(
                            "Select Id,(SELECT CreatedDate FROM CaseComments WHERE (((NOT CreatedBy.Email LIKE'%salesforce.com%') OR createdById='005300000075tiNAAQ') AND CreatedBy.Email!='mfullmore@00d30000000xsfgeas') order by CreatedDate desc LIMIT 1) From Case  WHERE IsClosed=false AND Age_days__c>1.5 AND Id IN " +
                              CaseId +
                              "Order by Age_days__c desc",
                            function (err, result) {
                              if (err) {
                                return console.error(err);
                              }
                              result.records.forEach((element) => {
                                if (element.CaseComments != null) {
                                  caseCustComm.set(
                                    element.Id,
                                    new Date(
                                      element.CaseComments.records[0].CreatedDate
                                    )
                                  );
                                }
                              });
                            }
                          );
                          //-----End---------

                          conn.query(
                            "Select Id,  (Select Id, CreatedDate From CaseComments where  IsPublished=true  order by CreatedDate desc LIMIT 1 ) From Case  WHERE IsClosed=false AND Age_days__c>1.5 AND Id IN " +
                              CaseId,
                            function (err, result) {
                              if (err) {
                                return console.error(err);
                              }

                              var caseComMap = new Map();
                              result.records.forEach((element) => {
                                if (element.CaseComments != null) {
                                  caseComMap.set(
                                    element.Id,
                                    new Date(
                                      element.CaseComments.records[0].CreatedDate
                                    )
                                  );
                                }
                              });

                              conn.query(
                                "Select Id, Case_Origin_OrgID__c, Status, IsVisibleInSelfService, GUS_Investigation_Number__c, AccountId, OwnerId, Owner.Name, CaseNumber,Age_days__c,Account.Name,Hotcase__c, FunctionalArea__c,(Select Id,  CreatedDate From CaseComments where  IsPublished=true AND (CreatedById='0050M00000FFDGAQA5' OR CreatedById='0050M00000EyVfnQAF') order by CreatedDate desc LIMIT 1 ) From Case  WHERE IsClosed=false AND Age_days__c>1.5 AND Id IN " +
                                  CaseId +
                                  "Order by Age_days__c desc",
                                function (err, result) {
                                  if (err) {
                                    return console.error(err);
                                  }
                                  fetchParentCases(
                                    result.records,
                                    caseComMap,
                                    BusinessHrsMap,
                                    caseCustComm
                                  );
                                }
                              );
                            }
                          );
                        } else {
                          document.getElementById("my-spinner").style.display =
                            "none";
                        }
                      })
                      .run({
                        autoFetch: true,
                      });
                  })
                  .run({
                    autoFetch: true,
                  });
                conn.query(query3, function (err, result) {
                  if (err) {
                    console.log("Error in Scope 2>>>>", err);
                    return console.error("....error...>>>" + err);
                  }
                  var CaseId = "(";
                  var AccountId = "(";
                  result.records.forEach((element) => {
                    if (
                      element.CaseComments != null &&
                      element.CaseComments.totalSize == 1 &&
                      (element.CaseComments.records[0].CommentBody.includes(
                        "Severity: OKAY"
                      ) ||
                        element.CaseComments.records[0].CommentBody.includes(
                          "Severity: OK"
                        ))
                    ) {
                      var businessHrs = workingMinsBetweenDates(
                        new Date(element.CaseComments.records[0].CreatedDate),
                        new Date(),
                        true
                      );
                      var noOfSaturdays = getMinsOfSpecificDays(
                        new Date(element.CaseComments.records[0].CreatedDate),
                        new Date(),
                        "Sat",
                        element.CaseNumber
                      );
                      var noOfMondays = getMinsOfSpecificDays(
                        new Date(element.CaseComments.records[0].CreatedDate),
                        new Date(),
                        "Mon",
                        element.CaseNumber
                      );
                      var actualTime =
                        (businessHrs + noOfSaturdays - noOfMondays) / 60;
                      BusinessHrsMap.set(element.Id, actualTime.toFixed(2));
                      if (actualTime > 36) {
                        CaseId += "'" + element.Id + "',";
                        AccountId += "'" + element.AccountId + "',";
                      }
                    }
                  });
                });
              } else {
                document.getElementById("my-spinner").style.display = "none";
                document.getElementById("noCases").style.display = "block";
                document.getElementById("noCases").innerText =
                  "You have closed all your potential cases for closure";
              }
            })
            .run({
              autoFetch: true,
            });
        })
        .run({
          autoFetch: true,
        });
    }
  }
}

function fetchParentCases(caseData, caseComMap, BusinessHrsMap, caseCustComm) {
  try {
    CaseList.push([
      "Case Number",
      "Case Owner",
      "Account Name",
      "Org Id",
      "Alert Name",
      "VSSP",
      "Case Status",
      "Age (in days)",
      "Closure Age (Since Last Cleared Alert (hrs))",
      "GUS Investigation#",
      "Last Customer Comment Date",
      "Last Public Comment Date Time",
      "Closure Comments",
    ]);
    console.log("caseData.size>>>>", caseData.length);
    totalCasesToBeClosed = caseData.length;
    const userData = [...memberUserIdMap.values()];
    caseData.forEach((element) => {
      //console.log('element>>>', element);
      potentialClosureList.add(element.Id);
      let CustomerCommentDate = "";
      let PublicCommentDate = caseComMap.get(element.Id)
        ? caseComMap.get(element.Id)
        : "";
      //console.log(PublicCommentDate);
      let BusinessHrs = BusinessHrsMap.get(element.Id)
        ? BusinessHrsMap.get(element.Id)
        : "";
      //let Csat=csatMap.get(element.AccountId)?csatMap.get(element.AccountId): '';
      if (caseCustComm.get(element.Id))
        CustomerCommentDate = caseCustComm.get(element.Id);
      CaseList.push([
        "<a href='https://orgcs.lightning.force.com/lightning/r/Case/" +
          element.Id +
          "/view' target='_blank'>" +
          element.CaseNumber +
          "</a>",
        element.Owner.Name,
        element.AccountId != null ? element.Account.Name : undefined,
        element.Case_Origin_OrgID__c,
        element.FunctionalArea__c,
        element.IsVisibleInSelfService,
        element.Status,
        element.Age_days__c,
        BusinessHrs,
        element.GUS_Investigation_Number__c,
        CustomerCommentDate,
        PublicCommentDate.toString(),
      ]);
      PublicCommentDate = "";
      CustomerCommentDate = "";
      //Csat='';
    });

    GenerateCaseListTable(CaseList, caseData);

    for (var i = 1; i < CaseList.length; i++) {
      $("#btn" + i).click(function () {
        $(this)
          .closest("tr")
          .find("td:nth-child(1)")
          .each(function () {
            var textval = $(this).text(); // this will be the text of each <td>
            //console.log(textval);
            document.getElementById("closureComments").style.display = "block";
            generateClosureComment(textval);
          });
      });
    }
  } catch (ex) {
    console.log("Error>>>", ex);
  }
}

async function generateClosureComment(caseNumber) {
  let conn = await createConnection();
  let caseRecordsList = await conn.query(
    "SELECT Id from Case WHERE CaseNumber = '" + caseNumber + "'"
  );
  console.log(parentIdOfCase);
  parentIdOfCase = caseRecordsList.records[0].Id;
  console.log("caseNumber>>>", caseNumber);
  document.getElementById("spinner2").style.display = "block";
  document.getElementById("errorDiv").style = "display:none";
  document.getElementById("errorMsg").innerText = "";
  document.getElementById("closureComments").style = "display:block";
  let severity = "";
  let sevTag = "";

  let finalDetails = await fetchCaseDetails(caseNumber);
  console.log(finalDetails);

  if (!(await isCaseInternal(caseNumber))) {
    var finalClosureComment = "";
    var finalInternalComment =
      "===================INTERNAL======================\n\n" +
      "Closing this Internal Case as the alert triggered due to an block-listed element  OR  Average time is less.";
    console.log(finalInternalComment);
  } else if ((await isCaseInternal(caseNumber)) && finalDetails == undefined) {
    var finalClosureComment = "";
    var finalInternalComment =
      "===================INTERNAL======================\n\n" +
      "No Public comment posted but VSSP is true, Please go through case comments once";
    console.log(finalInternalComment);
  } else {
    var formattedClearedTime = new Date(
      finalDetails.lastClearedAlertTime
    ).toUTCString();
    var finalClosureComment =
      "Hi Team,\n\n" +
      "This is to inform you that we have not received any WARN / CRITICAL alerts for your org since our last communication.\n\n" +
      "This indicates that your org is in healthy status and hence we are closing this case as of now. If you face any issues, please feel free to re-open the case or reach out to us via a new case and we would be happy to assist you.\n\n" +
      "Closing Summary: " +
      finalDetails.alertName +
      "\n\nLast Communicated Details:\n" +
      finalDetails.lastPublicComment +
      "\n\nLast CLEARED Alert for this case was received on: " +
      formattedClearedTime +
      ".\n\n" +
      "\nWe will continue to monitor the trend and keep you posted with additional details. If you subsequently have additional questions regarding this alert, please let us know and we will reach out to you at our earliest convenience.\n" +
      "\nBest Regards,\n" +
      "Proactive Monitoring Team | Salesforce\n";

    if (
      finalClosureComment.includes(
        "Thanks,\nProactive Monitoring Team - Salesforce"
      )
    ) {
      finalClosureComment = finalClosureComment.replace(
        "Thanks,\nProactive Monitoring Team - Salesforce",
        ""
      );
      finalClosureComment = finalClosureComment.replace("/^s*\n/gm", "");
    }

    if (
      finalDetails.lastPublicComment.substr(1, 250).includes("WARN") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("Warning") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("warning")
    ) {
      severity = "WARNING";
    } else if (
      finalDetails.lastPublicComment.substr(1, 250).includes("CRIT") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("Critical") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("critical")
    ) {
      severity = "CRITICAL";
      sevTag = "#criticalnoresponse\n";
    } else if (
      finalDetails.lastPublicComment.substr(1, 250).includes("exhausted") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("EXHAUSTED") ||
      finalDetails.lastPublicComment.substr(1, 250).includes("Exhausted")
    ) {
      severity = "EXHAUSTED";
      sevTag = "#criticalnoresponse\n";
    }
    console.log("severity>>>", severity);
    var finalInternalComment =
      "#PROMResolution\n" +
      sevTag +
      "\n" +
      "============ INTERNAL ========= \n " +
      "AlertResolution: Updated the customer with details causing the alert . No other action taken, the alert decreased on its own.\n" +
      "Closing Summary:" +
      "\n Issue: " +
      finalDetails.alertName +
      "\n Last Communicated Details:\n" +
      finalDetails.lastPublicComment +
      "\n\nLast CLEARED Alert for this case was received on: " +
      formattedClearedTime +
      ".\n\n" +
      "Customer Response: Did the customer ever respond (at least once)? N\n\n" +
      "Severity: " +
      severity +
      " \n" +
      "Triggered From: GADGET\n";

    if (
      finalInternalComment.includes(
        "Thanks,\nProactive Monitoring Team - Salesforce"
      )
    ) {
      finalInternalComment = finalInternalComment.replace(
        "Thanks,\nProactive Monitoring Team - Salesforce",
        ""
      );
      finalInternalComment = finalInternalComment.replace("/^s*\n/gm", "");
    }
  }

  console.log("finalInternalComment>>>", finalInternalComment);
  document.getElementById("closureComment").value = finalClosureComment;
  document.getElementById("internalComment").value = finalInternalComment;
  document.getElementById("spinner2").style.display = "none";
}

async function isCaseInternal(caseNumber) {
  let conn = await createConnection();
  let isVisible = await conn.query(
    "SELECT IsVisibleInSelfService, Id FROM Case WHERE CaseNumber='" +
      caseNumber +
      "'"
  );
  console.log(isVisible);
  if (isVisible.records[0].IsVisibleInSelfService) {
    return true;
  }
  return false;
}

async function fetchCaseDetails(caseNumber) {
  let conn = await createConnection();
  let commentDetails = await conn.query(
    "SELECT Parent.Id, Parent.CaseReportingTaxonomy__c, ParentId, IsPublished , CommentBody , CreatedDate FROM CaseComment WHERE isPublished = true AND Parent.CaseNumber = '" +
      caseNumber +
      "' AND ( CreatedBy.Email LIKE'%salesforce.com%') AND createdById!='005300000075tiNAAQ' AND ( CommentBody LIKE '%help article for more insights%' OR  CommentBody LIKE '%help article with alert details%' OR  CommentBody LIKE '%nvestigation%' OR CommentBody LIKE '%The Monitoring Team has detected%' OR CommentBody LIKE '%We have received%' ) AND  CreatedById NOT IN('0050M00000FFDGAQA5') ORDER BY CreatedDate DESC LIMIT 1"
  );
  console.log(commentDetails.records);
  if (commentDetails.records.length > 0) {
    let lastClearedAlertTime = await fetchClearedAlertDate(caseNumber);
    let alertNameId = commentDetails.records[0].Parent.CaseReportingTaxonomy__c;
    console.log(commentDetails.records[0].CommentBody);
    let lastPublicComment = commentDetails.records[0].CommentBody;
    let parentId = commentDetails.records[0].ParentId;
    let alertName = await fetchAlertName(alertNameId);

    let publicClosureComment = {
      lastClearedAlertTime: lastClearedAlertTime,
      alertName: alertName,
      lastPublicComment: lastPublicComment,
      caseNum: caseNumber,
      parentId: parentId,
    };
    return publicClosureComment;
  }
}

async function fetchClearedAlertDate(caseNumber) {
  let conn = await createConnection();

  let clearedAlertTime = await conn.query(
    "SELECT Parent.Id , CommentBody , CreatedDate FROM CaseComment WHERE IsPublished = false AND Parent.CaseNumber = '" +
      caseNumber +
      "' AND CommentBody LIKE '%[CLEARED]%' ORDER BY CreatedDate DESC"
  );

  return clearedAlertTime.records[0].CreatedDate;
}

async function fetchAlertName(Id) {
  let conn = await createConnection();

  let alertName = await conn.query(
    "SELECT Name FROM CaseReportingTaxonomy__c WHERE Id = '" + Id + "' "
  );
  return alertName.records[0].Name;
}

function GenerateCaseListTable(CaseListData, caseListOriginalData) {
  console.log("Table generated");
  if (
    document.getElementById("getView").value == "MangerView" &&
    CaseListData.length > 1
  ) {
    document.getElementById("reAssignClosureDiv").style.display = "block";
    if (currentGEOoftheUser != "emea") {
      document.getElementById("reAssignClosure").style.display = "none";
    }
    document.getElementById("noCases").style.display = "none";
    let reAssignClosure = document.getElementById("reAssignClosure");
    reAssignClosure.addEventListener("click", function () {
      console.log("Clicked on Re-assign Closure");
      //console.log('presentPROMEngineers>>>', presentPROMEngineers);
      document.getElementById("my-spinner").style.display = "block";
      reAssignPotentialClosure();
    });
  }

  if (CaseListData.length > 1) {
    document.getElementById("thId").innerHTML = "";
    document.getElementById("tbId").innerHTML = "";
    var tablehead = document.getElementById("thId");
    document.getElementById("thId").setAttribute("class", "table");
    document.getElementById("tbId").setAttribute("class", "table");
    var columnCount = CaseListData[0].length;

    var row = tablehead.insertRow(-1);
    for (var i = 0; i < columnCount; i++) {
      var headerCell = document.createElement("TH");
      headerCell.innerHTML = CaseListData[0][i];
      row.appendChild(headerCell);
    }
    var tablebody = document.getElementById("tbId");

    for (var i = 1; i < CaseListData.length; i++) {
      row = tablebody.insertRow(-1);
      for (var j = 0; j < columnCount; j++) {
        var cell = row.insertCell(-1);
        if (j == 12) {
          var button = document.createElement("button");
          button.style.backgroundColor = "black";
          button.style.color = "white";
          button.style.fontSize = "13px";
          button.innerHTML = "Generate";
          button.setAttribute("class", "btn");
          button.setAttribute("id", "btn" + i);

          cell.appendChild(button);
        } else {
          cell.innerHTML = CaseListData[i][j];
        }
      }
    }

    /*for (var i = 1; i < CaseListData.length; i++) {
            row = tablebody.insertRow(-1);
            for (var j = 0; j < columnCount; j++) {
            var cell = row.insertCell(-1);
            cell.innerHTML = CaseListData[i][j];
            }
        } */

    document.getElementById("dvTable").style.display = "inline-block";
    document.getElementById("myInput").style.display = "inline-block";
    document.getElementById("my-spinner").style.display = "none";

    //dvTable.appendChild(table);
  } else {
    document.getElementById("my-spinner").style.display = "none";
    document.getElementById("noCases").style.display = "block";
    document.getElementById("noCases").innerText =
      "You have closed all your potential cases for closure";
  }
}

async function reAssignPotentialClosure() {
  try {
    console.log("potentialClosureList>>>", potentialClosureList);
    console.log("presentPROMEngineers>>>", presentPROMEngineers);
    let conn = await createConnection();
    var i = 0;
    var updateCase = [];
    const teList = Array.from(presentPROMEngineers);
    const result = Array.from(potentialClosureList);
    if (teList != null && teList.length != 0) {
      var teListSize = teList.length;
      for (var j = 0; j < result.length; j++) {
        //result[a].ownerId = teList[i];
        var x = {
          ownerId: memberUserIdMap.get(teList[i]),
          Id: result[j],
        };
        updateCase.push(x);
        if (i < teListSize - 1) i++;
        else i = 0;
      }
      console.log("updateCase>>", updateCase);
      if (updateCase.length > 0) {
        var size = 40;
        var finalary = [];
        for (var i = 0; i < updateCase.length; i += size) {
          finalary.push(updateCase.slice(i, i + size));
        }
        var totalUpdated = 0;
        for (i = 0; i < finalary.length; i++) {
          //console.log ('arry list' + ' ' + finalary[i]);
          conn
            .sobject("case")
            .update(
              finalary[i],
              { headers: { "Sforce-Auto-Assign": false } },
              function (err, rets) {
                console.log("rets>>", rets);
                totalUpdated += rets.length;
                if (totalUpdated == updateCase.length) {
                  document.getElementById("my-spinner").style.display = "none";
                  alert("Cases has been re-assignment Successfully.");
                  location.reload();
                }
                console.log("err>>", err);
                if (err) {
                  document.getElementById("my-spinner").style.display = "none";
                  console.log("line 350");
                  console.log("err" + " " + err);
                  document.getElementById("message").innerHTML =
                    "There is internal error. Please reach out to Imran Shaik---" +
                    err;
                  if (rets[i].success) {
                    document.getElementById("my-spinner").style.display =
                      "none";
                    console.log("line 360");
                    document.getElementById("spinner2").style.display = "none";
                    document.getElementById("message").innerHTML =
                      "<center><p style='background-color: greenyellow;font-size: 15px;font-weight: bold;'>Cases Assigned Successfully</p></center>";
                    document
                      .getElementById("spinner")
                      .classList.remove("loader");
                  }
                }
              }
            );
        }
      }
    } else {
      document.getElementById("my-spinner").style.display = "none";
      document.getElementById("spinner2").style.display = "none";
      document.getElementById("noCases").style.display = "block";
      document.getElementById("noCases").innerText =
        "You have closed all your potential cases for closure";
    }
  } catch (ex) {
    document.getElementById("my-spinner").style.display = "none";
    console.log("Error in reAssignPotentialClosure>>>>", ex);
  }
}

function workingMinsBetweenDates(startDate, endDate, ExcludeWeekends) {
  var minutesWorked = 0;
  if (endDate < startDate) {
    return 0;
  }
  var current = startDate;
  while (current <= endDate) {
    var currentTime = current.getHours() + current.getMinutes() / 60;
    if (
      ExcludeWeekends ? current.getDay() !== 0 && current.getDay() !== 6 : true
    ) {
      minutesWorked++;
    }
    current.setTime(current.getTime() + 1000 * 60);
  }
  return minutesWorked;
}

function getMinsOfSpecificDays(date1, date2, dayToSearch, caseNumber) {
  var stdate = new Date(date1);
  var dateObj1 = new Date(date1);
  var dateObj2 = new Date(date2);
  var satbolean = true; // To exclude Sat if alert is cleared on Saturday.
  var Monbolean = true; // To exclude Mon if alert is cleared on Monday.
  if (stdate.getDay() == 6) satbolean = false;
  if (stdate.getDay() == 1) Monbolean = false;

  var count = 0;
  var DiffMinsSat = 0;
  var DiffMinsMon = 0;
  var week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var dayIndex = week.indexOf(dayToSearch);
  while (dateObj1.getTime() <= dateObj2.getTime()) {
    if (
      dateObj1.getDay() == dayIndex &&
      ((satbolean && dayToSearch == "Sat") ||
        (Monbolean && dayToSearch == "Mon"))
    ) {
      count++;
    }
    satbolean = true;
    Monbolean = true;
    dateObj1.setDate(dateObj1.getDate() + 1);
  }
  if (
    stdate.getDay() == 6 &&
    stdate.getHours() < 5 &&
    stdate.getMinutes() < 30 &&
    dayToSearch === "Sat"
  ) {
    var diff =
      Math.abs(
        new Date(
          stdate.getFullYear(),
          stdate.getMonth(),
          stdate.getDate(),
          5,
          30,
          0
        ) - stdate
      ) / 1000;
    DiffMinsSat = diff / 60;
  }

  if (
    stdate.getDay() == 1 &&
    stdate.getHours() < 21 &&
    stdate.getMinutes() < 30 &&
    dayToSearch === "Mon"
  ) {
    var diff =
      Math.abs(
        new Date(
          stdate.getFullYear(),
          stdate.getMonth(),
          stdate.getDate(),
          21,
          30,
          0
        ) - stdate
      ) / 1000;
    //var diff = (Math.abs(new Date(stdate.getFullYear(), stdate.getMonth(), stdate.getDate(), 21, 30, 00) - stdate)) / 1000;
    DiffMinsMon = diff / 60;
  }

  if (dayToSearch === "Sat") {
    count *= 330;
    count += DiffMinsSat;
  } else if (dayToSearch === "Mon") {
    count *= 1290;
    count -= DiffMinsMon;
  }

  return count;
}
