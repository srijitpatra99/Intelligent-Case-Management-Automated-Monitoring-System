// NOTE: Create an instance of jsforce connection object and pass to every service method that you write here.
import {
	getSalesforceAuthContext,
	getCurrentAuthContext,
} from "../utils/auth.js";
import {
	fetchAlertOwnerFromLastLine,
	fetchNDNFfromInternalComments,
	fetchOwnerNameFromCaseHistory,
	fetchSHIFromCaseFeed,
	fetchDeploymentOwnerNameFromCaseHistory,
} from "../utils/commonUtils.js";
import {
	GADGET_TEAM_USER_ID,
	ORGCS_DOMAIN_NAME,
	PROM_CASE_AUDITED_TAG,
	PROQA_PROCESS_NAME,
} from "../utils/constants.js";
import Logger from "../utils/Logger.js";
import { createBasicNotification } from "./notificationService.js";

// GET methods
export async function fetchClosureCasesForQA(closureBounds, alert, te) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching closed cases from ${closureBounds[0]} to ${closureBounds[1]} for Alert - ${alert} and TE - ${te}`,
	);
	let con = await createConnection();
	let lowerBound = closureBounds[0];
	let upperBound = closureBounds[1];

	let where_clause = `WHERE CaseRoutingTaxonomy__c = 'a6C3y000000oM1GEAU' AND Reason='Proactive Monitoring' AND Subject LIKE '%[PROACTIVE MONITORING NOTIFICATION%' AND CaseReportingTaxonomy__c != null AND Status = 'Closed' AND (ClosedDate >= ${lowerBound} AND ClosedDate <= ${upperBound}) AND ((NOT Account_Support_SBR_Category__c LIKE '%JP%') AND (NOT Account_Support_SBR_Category__c LIKE '%MCS - GOVT%') AND (NOT Account_Support_SBR_Category__c LIKE '%MCS - US only - GOVT%')) AND IsVisibleInSelfService = true`;

	if (alert) {
		where_clause += ` AND CaseReportingTaxonomy__c = '${alert}'`;
	}

	if (te) {
		where_clause += ` AND OwnerId = '${te}'`;
	}

	let queryString = `SELECT Id, OwnerId, CaseNumber, CreatedDate, ClosedDate, Status, CaseRoutingTaxonomy__c, CaseReportingTaxonomy__c from Case ${where_clause} LIMIT 1000`;
	try {
		let res = await con.query(queryString);
		if (res == null || res.error) {
			createBasicNotification(
				"../views/css/slds/assets/icons/utility/error.svg",
				"Error occured !!",
				"Error occured while fetching case records.",
				[],
			);
			console.log(
				"Error occured while fetching case records.",
				res.error,
			);
			return;
		}
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			`No of. records fetched => ${res.records.length}`,
		);
		console.log("No of. records fetched =>", res.records.length);
		return res.records;
	} catch (error) {
		// raise exception msg. Catching here is necessary to identify stale/expired session IDs
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching case records.",
			[],
		);
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			`Error occured while fetching case records. ${error}`,
		);
		console.log("Error occured while fetching case records.", error);
		return;
	}
}

export async function fetchRecordNameById(sobjectName, recordId) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching ${sobjectName} record - 'Name' Attribute - by Id - ${recordId}.`,
	);
	let con = await createConnection();
	let queryString =
		"SELECT Name from " +
		sobjectName +
		" WHERE ID = '" +
		recordId +
		"' LIMIT 1";
	let res = await con.query(queryString);
	if (res == null || res.error) {
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			`Error occured while fetching case records. ${res.error}`,
		);
		console.log("Error occured while fetching case records.", res.error);
		return;
	}
	if (res && res.records && res.records.length == 1) {
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			`Fetched record Name -> ${res.records[0].Name}`,
		);
		return res.records[0].Name;
	}
}

export async function fetchAuditedCaseData(caseId) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching case date for Audit Case Id - ${caseId}`,
	);
	let con = await createConnection();
	let queryString = `SELECT Id, OwnerId, CreatedDate, ClosedDate, CaseNumber, CaseReportingTaxonomy__c, Status, Description,Case_Origin_OrgID__c, Subject FROM Case where Id = '${caseId}'`;
	let res = await con.query(queryString);
	console.log(res);
	if (res == null || res.error) {
		console.log("Error occured while fetching case data.", res.error);
		return;
	}
	if (res && res.records && res.records.length == 1) {
		return res.records[0];
	}
}

export async function fetchCaseHistory(caseId) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching case history for Audit Case Id - ${caseId}`,
	);
	let con = await createConnection();
	let queryString = `SELECT Id, CaseId, CreatedById, CreatedDate, Field, IsDeleted, OldValue, NewValue from CaseHistory where CaseId='${caseId}' ORDER BY CreatedDate`;
	let res = await con.query(queryString);
	if (res == null || res.error) {
		console.log("Error occured while fetching case data.", res.error);
		return;
	}
	if (res && res.records) {
		return res.records;
	}
}


export async function fetchUserFieldFromUserId(userId, fieldToGet) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching User record - '${fieldToGet}' field - by Id - ${userId}`,
	);
	let con = await createConnection();

	let queryString = `SELECT ${fieldToGet} from User WHERE Id = '${userId}'`;
	let res = await con.query(queryString);
	if (res == null || res.error) {
		console.log("Error occured while fetching case data.", res.error);
		return;
	}
	if (res && res.records && res.records.length == 1) {
		return res.records[0][fieldToGet];
	}
}

export async function fetchCaseComments(
	caseId,
	commentType,
	createdbyId,
	createdDatetimeFrom,
	createdDatetimeTo,
	noOfComments,
	orderByFieldname,
	order,
) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching CaseComments record - by CaseId - ${caseId} - commentType - '${commentType}' - createdbyId - '${createdbyId}' - createdDatetimeFrom - '${createdDatetimeFrom}' - createdDatetimeTo - '${createdDatetimeTo}' - noOfComments - '${noOfComments}' - orderByFieldname - '${orderByFieldname}' - order - '${order}'`,
	);
	let con = await createConnection();
	let queryString = `SELECT Id, ParentId, CreatedById, CommentBody, IsPublished, CreatedDate from CaseComment`;
	let whereClause = "";
	let orderByClause = "";
	let limitClause = "";

	if (caseId) {
		whereClause += ` WHERE ParentId = '${caseId}'`;
	}
	if (commentType.toLowerCase() == "public") {
		whereClause += ` AND IsPublished = true`;
	} else {
		whereClause += ` AND IsPublished = false`;
	}
	if (createdbyId) {
		whereClause += ` AND CreatedById = '${createdbyId}'`;
	}

	if (createdDatetimeFrom) {
		whereClause += ` AND CreatedDate >= ${createdDatetimeFrom}`;
	}
	if (createdDatetimeTo) {
		whereClause += ` AND CreatedDate <= ${createdDatetimeTo}`;
	}

	if (noOfComments > 0 && noOfComments != null && noOfComments != undefined) {
		limitClause = ` LIMIT ${noOfComments}`;
	}
	if (orderByFieldname && order) {
		orderByClause = ` ORDER BY ${orderByFieldname} ${order}`;
	} else {
		orderByClause = ` ORDER BY CreatedDate`;
	}
	try {
		let res = await con.query(
			`${queryString}${whereClause}${orderByClause}${limitClause}`,
		);
		if (res == null || res.error) {
			createBasicNotification(
				"../views/css/slds/assets/icons/utility/error.svg",
				"Error occured !!",
				"Error occured while fetching case comments. Please try again!!",
				[],
			);
			console.log(
				"Error occured while fetching case comments.",
				res.error,
			);
			return;
		}
		return res.records;
	} catch (error) {
		// raise exception msg. Catching here is necessary to identify stale/expired session IDs
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching case comments.Please try again!!",
			[],
		);
		console.log("Error occured while fetching case comments.", error);
		return;
	}
}

export async function fetchCustComment(caseId, caseOwnerId, fromTime, toTime) {
	Logger.logEvent(
		PROQA_PROCESS_NAME,
		`Fetching Customer Comments on case - by CaseId - ${caseId} - caseOwnerId - '${caseOwnerId}' - fromTime - '${fromTime}' - toTime - '${toTime}'`,
	);
	let con = await createConnection();
	let queryString = `SELECT Id, CreatedDate, ParentId, CommentBody, IsPublished FROM CaseComment `;
	let whereClause = `WHERE ParentId = '${caseId}' AND ((NOT CreatedBy.Email LIKE'%salesforce.com%') OR createdById = '005300000075tiNAAQ')`;
	let orderByClause = "";
	if (caseOwnerId) {
		whereClause += ` AND Parent.OwnerId = '${caseOwnerId}'`;
	}
	if (fromTime) {
		whereClause += ` AND CreatedDate >= ${fromTime}`;
	}
	if (toTime) {
		whereClause += ` AND CreatedDate <= ${toTime}`;
	}
	orderByClause = ` ORDER BY CreatedDate DESC`;

	let query = `${queryString}${whereClause}${orderByClause}`;

	let res = await con.query(query);
	if (res == null || res.error) {
		console.log("Error occured while fetching case data.", res.error);
		return;
	}
	if (res && res.records) {
		return res.records;
	}
}

export async function getLoggedInUserData() {
	let currentAuthContext = await getCurrentAuthContext();
	if (currentAuthContext) {
		let con = await createConnection();
		if (!con) {
			return null;
		}
		try {
			let identity = await con.identity();
			if (identity) {
				return identity;
			}
		} catch (err) {
			console.log(err);
			return null;
		}
	}
}

export async function fetchEMEAPresentTENames(selectedQuery) {
	let con = await createConnection();
	let res = await con.query(selectedQuery);
	console.log("res>>>>", res);
	if (res == null || res.error) {
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			`Error occured while fetching case records. ${res.error}`,
		);
		console.log("Error occured while fetching case records.", res.error);
		return;
	}
	if (res && res.records && res.records.length == 1) {
		Logger.logEvent(PROQA_PROCESS_NAME, `Fetched records}`);
		console.log("res.records");
		return res.records;
	}
}

export async function getCaseDetails(casenum) {
	try {
		let conn = await createConnection();
		//let userDetails = await getLoggedInUserData();
		// added Parent.FunctionalArea__c by sandeep
		let lastUpdate = await conn.query(
			"SELECT Id, ParentId, Parent.AccountId, Parent.CaseNumber, Parent.Subject,Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name ,Parent.Owner.Name FROM  CaseComment WHERE Parent.CaseNumber='" +
				casenum +
				"' AND Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' LIMIT 1  ",
		);
		console.log(lastUpdate.records);
		if (lastUpdate.records.length == 1) return lastUpdate.records[0];
		else return false;
	} catch (er) {
		console.log("Error in function getCaseComments>>>", er);
	}
}

export async function getTEResponse(dateTime, user_id, caseParentID) {
	try {
		let conn = await createConnection();
		let customerCommentCases = await conn.query(
			"SELECT Id, CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
				dateTime +
				" AND ParentId ='" +
				caseParentID +
				"' AND IsPublished=true AND CreatedBy.Email LIKE'%salesforce.com%' AND (Parent.ownerId='" +
				user_id +
				"') AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') AND Parent.IsClosed=false AND (NOT(CommentBody LIKE '%Hi Team%' OR CommentBody LIKE '%Hello Team%') ) Order by CreatedDate Desc LIMIT 1",
		);
		return customerCommentCases.records[0];
	} catch (err) {
		console.log("Error in function getTEResponse>>>", er);
	}
}

export async function getCasesWithCustomerComments(dateTime, user_id) {
	var result = [];
	try {
		let conn = await createConnection();
		let customerCommentCases = await conn.query(
			"SELECT Id, CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate>" +
				dateTime +
				" AND ((NOT CreatedBy.Email LIKE'%salesforce.com%') OR createdById='005300000075tiNAAQ') AND (Parent.ownerId='" +
				user_id +
				"') AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') AND Parent.IsClosed=false Order by CreatedDate Desc LIMIT 9999",
		);
		result.push(...customerCommentCases.records);
		let customerEmailCases = await conn.query(
			"SELECT Id,TextBody, ParentId,FromAddress,CreatedDate,Parent.AccountId,Parent.Account.Name,Parent.Status,Parent.CaseNumber,Parent.Case_Origin_OrgID__c,Parent.FunctionalArea__c,Parent.IsClosed FROM EmailMessage WHERE CreatedDate > " +
				dateTime +
				" AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (Parent.ownerId='" +
				user_id +
				"') AND FromAddress NOT IN('customersupport@salesforce.com','system@salesforce.com','no.reply@salesforce.com') AND Parent.IsClosed=false Order by CreatedDate Desc LIMIT 9999",
		);
		result.push(...customerEmailCases.records);
		return result;
	} catch (er) {
		console.log("Error in function getCasesWithCustomerComments>>>", er);
	}
}

export async function fetchFieldFromRecord(
	fieldList,
	sobjectName,
	identifierName,
	identifierValue,
) {
	let query;
	if (fieldList.length > 1) {
		query = `SELECT ${fieldList.join(
			",",
		)} FROM ${sobjectName} WHERE ${identifierName} = '${identifierValue}'`;
	} else if (fieldList.length == 1) {
		query = `SELECT ${fieldList[0]} FROM ${sobjectName} WHERE ${identifierName} = '${identifierValue}'`;
	}
	let con = await createConnection();
	let result = await con.query(query);
	if (result && result.records) {
		return result.records[0];
	}
}

export async function fetchOpenPromCases() {
	let con = await createConnection();
	let openPromCases = await con.query(
		`SELECT Id, CaseNumber, CreatedDate, ClosedDate, Status FROM Case WHERE Status != 'Closed' AND CaseRoutingTaxonomy__c = 'a6C3y000000oM1GEAU'`,
	);
	return openPromCases;
}

export async function searchCaseCommentsByCommentBody(searchTerm, caseIds) {
	const conn = await createConnection();
	const searchResultsList = [];

	try {
		const chunkSize = 100;
		const caseIdChunks = [];
		for (let i = 0; i < caseIds.length; i += 100) {
			caseIdChunks.push(caseIds.slice(i, i + chunkSize));
		}

		for (const caseIdChunk of caseIdChunks) {
			const where_clause = caseIdChunk.join("','");
			const query = `FIND {"${searchTerm}"} IN CommentBody Fields RETURNING CaseComment (ParentId, CreatedDate Where ParentId IN ('${where_clause}'))`;
			const searchResults = await conn.search(query);
			const records = searchResults.searchRecords;
			if (records && records.length > 0) {
				searchResultsList.push(records);
			} else {
				console.log("No matching CaseComment records found.");
			}
		}
	} catch (err) {
		console.error("Error executing SOSL query:", err);
	}
}

export async function fetchAlertByOwner(caseOwnerId, fromTime, toTime) {
	let con = await createConnection();
	let query = `SELECT ParentId, CommentBody, CreatedDate FROM CaseComment`;
	let where_clause = "";
	if (caseOwnerId) {
		where_clause += ` WHERE Parent.OwnerId = '${caseOwnerId}' `;
	}
	if (fromTime) {
		where_clause += ` AND CreatedDate >= ${fromTime} `;
	}
	if (toTime) {
		where_clause += ` AND CreatedDate <= ${toTime} `;
	}
	where_clause += ` AND CreatedById = '${GADGET_TEAM_USER_ID}'`;
	try {
		const res = await con.query(query + where_clause);
		if (res == null || res.error) {
			createBasicNotification(
				"../views/css/slds/assets/icons/utility/error.svg",
				"Error occured !!",
				"Error occured while fetching alerts by owner. Please try again!!",
				[],
			);
			console.log("Error occured while alerts by owner.", res.error);
			return;
		}
		return res.records;
	} catch (err) {
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching alerts by owner.Please try again!!",
			[],
		);
		console.log("Error occured while fetching alerts by owner.", err);
		return;
	}
}

export async function fetchUpdatesSendByTE(teId, fromTime, toTime, updateType) {
	let con = await createConnection();
	let query = `SELECT Id,CommentBody from CaseComment where CreatedById = '${teId}' AND CreatedDate > ${fromTime} AND CreatedDate <= ${toTime} and IsPublished = ${
		updateType == "public" ? "True" : "False"
	}`;
	let res = await con.query(query);
	if (res == null || res.error) {
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching alerts by owner. Please try again!!",
			[],
		);
		console.log("Error occured while alerts by owner.", res.error);
		return;
	}
	return res.records;
}

export async function fetchClosedCases(teId, fromTime, toTime) {
	let con = await createConnection();
	let query = `SELECT Id from Case WHERE Status = 'Closed' AND OwnerId='${teId}' AND ClosedDate >= ${fromTime} AND ClosedDate <= ${toTime}`;
	let res = await con.query(query);
	if (res == null || res.error) {
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching alerts by owner. Please try again!!",
			[],
		);
		console.log("Error occured while alerts by owner.", res.error);
		return;
	}
	return res.records;
}

export async function fetchInternalCases(teId) {
	let con = await createConnection();
	let query = `SELECT Id, CaseNumber from Case WHERE OwnerId = '${teId}' AND (Status = 'Working' OR Status = 'Need More Information') AND CaseRoutingTaxonomy__c = 'a6C3y000000oM1GEAU' AND Reason='Proactive Monitoring' AND IsVisibleInSelfService = false`;
	let res = await con.query(query);
	if (res == null || res.error) {
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching internal cases. Please try again!!",
			[],
		);
		console.log("Error occured while fetching internal cases.", res.error);
		return;
	}
	return res.records;
}

export async function getCaseComments(dateTime, user_id) {
	try {
		let conn = await createConnection();
		//let userDetails = await getLoggedInUserData();
		let lastUpdate = await conn.query(
			"SELECT Id, ParentId, Parent.AccountId,Parent.Status,CreatedDate,Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM  CaseComment WHERE CreatedDate >" +
				dateTime.toString() +
				" AND CreatedById='005Hx000001Q2FJIA0' AND Parent.IsClosed=false AND IsPublished=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (Parent.ownerId='" +
				user_id +
				"')  Order by CreatedDate Desc LIMIT 9999 ",
		);
		return lastUpdate.records;
	} catch (er) {
		console.log("Error in function getCaseComments>>>", er);
	}
}

export async function getPublicComments(currTime, caseParentID, user_id) {
	try {
		let conn = await createConnection();
		//let userDetails = await getLoggedInUserData();
		let lastUpdate = await conn.query(
			"SELECT Id, ParentId, Parent.Status,CreatedDate,Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM  CaseComment WHERE CreatedDate >" +
				currTime.toString() +
				" AND ParentId ='" +
				caseParentID +
				"' AND IsPublished=true AND Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (Parent.ownerId='" +
				user_id +
				"') AND CreatedBy.Email LIKE'%salesforce.com%' AND (CommentBody Like '%Hi Team%' OR CommentBody Like '%Hello Team%' OR CommentBody Like '%Dear%') Order by CreatedDate Desc LIMIT 1",
		);
		return lastUpdate.records[0];
	} catch (err) {
		console.log("Error in function getPublicComments>>>", er);
	}
}
export async function getInternalComments(currTime, caseParentID, user_id) {
	try {
		let conn = await createConnection();
		//let userDetails = await getLoggedInUserData();
		let lastUpdate = await conn.query(
			"SELECT Id, ParentId, Parent.Status,CreatedDate,Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM  CaseComment WHERE CreatedDate >" +
				currTime.toString() +
				" AND ParentId ='" +
				caseParentID +
				"' AND CreatedById!='005Hx000001Q2FJIA0' AND  IsPublished=false AND Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (Parent.ownerId='" +
				user_id +
				"') AND  ( CommentBody LIKE '%SEVERITY%' OR CommentBody LIKE '%Severity%' OR CommentBody LIKE '%severity%') Order by CreatedDate Desc LIMIT 1",
		);
		return lastUpdate.records[0];
	} catch (err) {
		console.log("Error in function getInternalComments>>>", er);
	}
}

export async function fetchAlerts(alertName, accName, orgId, fromTime, toTime) {
	let con = await createConnection();
	let prom = "Platform-Proactive Monitoring";
	let queryString = `SELECT Id, ParentId, CreatedDate, CommentBody, Parent.CaseNumber,  Parent.Case_Origin_OrgID__c,Parent.Subject, Parent.Status, Parent.FunctionalArea__c, Parent.Account.Name, Parent.Owner.Name FROM  CaseComment`;
	let whereClause =
		" WHERE (Parent.CaseRoutingTaxonomy__r.Name='" +
		prom +
		"') AND (CreatedById='" +
		GADGET_TEAM_USER_ID +
		"')";
	let orderByClause = " ORDER BY CreatedDate Desc";
	let limitClause = " LIMIT 9999";
	let query;
	if (fromTime) {
		whereClause += ` AND CreatedDate >= ${fromTime}`;
	}
	if (toTime) {
		whereClause += ` AND CreatedDate <= ${toTime}`;
	}
	if (orgId) {
		whereClause += ` AND (Parent.Case_Origin_OrgID__c='${orgId}')`;
	}
	if (accName) {
		whereClause += ` AND (Parent.Account.Name LIKE '${accName}%')`;
	}
	if (alertName != "All") {
		whereClause += ` AND (Parent.CaseReportingTaxonomy__c='${alertName}')`;
	}

	try {
		let res = await con.query(
			`${queryString}${whereClause}${orderByClause}${limitClause}`,
		);
		return res.records;
	} catch (error) {
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"Error occured while fetching Alerts .Please try again!!",
			[],
		);
		console.log("Error occured while fetching Alerts :", error);
		return;
	}
}

export async function fetchUsersByGEO(query) {
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchCasesforMDE(mdeId) {
	var query =
		"SELECT Id FROM Case WHERE ownerId='" +
		mdeId +
		"' AND IsClosed =false AND CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' Order by Parent.Last_Public_Activity_Date_Time__c DESC NULLS LAST LIMIT 1999";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchCasesTobeTaken(query) {
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchAlertsDuringReassignmentService(endTime, timeStart) {
	var query =
		"SELECT Id, ParentId, CreatedDate, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.OwnerId FROM  CaseComment WHERE CreatedDate <= " +
		endTime +
		" AND  CreatedDate >= " +
		timeStart +
		" AND CreatedById='005Hx000001Q2FJIA0' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND  Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Parent.Subject LIKE '%PROACTIVE MONITORING NOTIFICATION%' Order by CreatedDate Desc LIMIT 80";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchOwnerInfoService(Id) {
	var query =
		"SELECT FirstName, LastName,Id from User WHERE Id = '" + Id + "'";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchCaseOwnerId(caseNumber) {
	var query =
		"SELECT OwnerId from CASE where CaseNumber='" + caseNumber + "'";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchVoiceCallData(alert) {
	var firstpart =
		"SELECT Id,Case__c, CreatedDate,UserId, Account__c, Contact__c, FromPhoneNumber, ToPhoneNumber FROM VoiceCall WHERE ";
	let endTime = new Date(alert.CreatedDate);
	var today = new Date();
	endTime = new Date(today).toISOString();
	endTime = endTime.replace("Z", "+0000");

	var wherePart =
		"Case__c = '" +
		alert.ParentId +
		"' AND CreatedDate >= " +
		alert.CreatedDate +
		" AND CreatedDate <= " +
		endTime;

	var query = firstpart + wherePart;
	let con = await createConnection();
	const recs = await con.query(query);

	return recs.records;
}

export async function fetchOwnerSalesforceHelper(id, endTime) {
	// var dateObj1 = new Date(endTime);
	// dateObj1.setMinutes(dateObj1.getMinutes() + 8);
	// var updatedDateTime1 = dateObj1.toISOString();
	var query = `SELECT CaseId, CreatedById, CreatedDate, Field,OldValue, NewValue FROM CaseHistory WHERE CaseId = '${id}' AND Field='Owner' AND CreatedDate < ${endTime} ORDER BY CreatedDate DESC LIMIT 1`;

	let con = await createConnection();
	const recs = await con.query(query);
	var result = fetchOwnerNameFromCaseHistory(recs.records);

	return result;
}

export async function checkForCustomerClosed(id, endTime) {
	var dateObj1 = new Date(endTime);
	dateObj1.setMinutes(dateObj1.getMinutes() - 110);
	var updatedDateTime1 = dateObj1.toISOString();
	var query = `SELECT CaseId, CreatedById, CreatedDate, Field,OldValue, NewValue FROM CaseHistory WHERE CaseId = '${id}' AND Field='Status' AND CreatedDate < ${updatedDateTime1} ORDER BY CreatedDate DESC LIMIT 1`;
	let con = await createConnection();
	const recs = await con.query(query);
	try {
		if (recs.records[0].NewValue == "Closed") return true;
	} catch (err) {
		// console.log(id, dateObj1);
		// console.log(query);
		return false;
	}
}

export async function fetchOwnerSalesforceHelper1(id, endTime, fromTime) {
	var query = `SELECT Id, Body, CreatedById, CreatedBy.Name, CreatedDate 
             FROM CaseFeed 
             WHERE ParentId = '${id}' 
             AND CreatedDate > ${fromTime} 
             AND CreatedDate < ${endTime} 
             ORDER BY CreatedDate DESC`;

	let con = await createConnection();
	const recs = await con.query(query);
	let result = fetchAlertOwnerFromLastLine(recs.records);
	if (
		result.length < 40 &&
		!result.includes(".com") &&
		!result.includes(".edu") &&
		!result.includes(".net") &&
		!result.includes(".in") &&
		!result.includes(".org") &&
		!result.includes(".fr") &&
		!result.includes(".co") &&
		!result.includes(".kr") &&
		!result.includes(".uk") &&
		!result.includes(".gov") &&
		result != "nonono"
	) {
		return result;
	} else {
		let result = await fetchOwnerSalesforceHelper(id, endTime);
		return result;
	}
}

export async function fetchSHI(id, endTime, fromTime) {
	var query = `SELECT Id, Body, CreatedById, CreatedBy.Name, CreatedDate 
             FROM CaseFeed 
             WHERE ParentId = '${id}' 
             AND CreatedDate > ${fromTime} 
             AND CreatedDate < ${endTime} 
             ORDER BY CreatedDate DESC`;

	let con = await createConnection();
	const recs = await con.query(query);
	let result = fetchSHIFromCaseFeed(recs.records);
	return result;
}

export async function fetchAlertsforVoiceCall(
	dateTime,
	dateTime1,
	orgId,
	alertName,
) {
	var firstpart =
		"SELECT Id,ParentId,Parent.Account.Name,Parent.Support_Region__c,Parent.Account.Region__c,Parent.ContactMobile,Parent.ContactPhone,Parent.FunctionalArea__c,Parent.Owner.Name,Parent.CaseNumber,CreatedDate,CommentBody FROM CaseComment";

	var wherePart =
		" WHERE Parent.CaseRoutingTaxonomy__c = 'a6C3y000000oM1GEAU' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND CreatedDate > " +
		dateTime +
		" AND CreatedDate < " +
		dateTime1;
	if (orgId) {
		wherePart += ` AND (Parent.Case_Origin_OrgID__c='${orgId}')`;
	}
	if (alertName != "All") {
		wherePart += ` AND (Parent.CaseReportingTaxonomy__c='${alertName}') AND CreatedById='005Hx000001Q2FJIA0'`;
	} else {
		wherePart += ` AND Parent.CaseReportingTaxonomy__c IN ('a6BHx000000001qMAA','a6BHx000000001rMAA','a6BHx000000001sMAA','a6BHx000000001tMAA','a6BHx000000001dMAA') AND CreatedById='005Hx000001Q2FJIA0'`;
	}
	var query = firstpart + wherePart;
	var done = false;
	var result = [];
	try {
		let con = await createConnection();
		var recs = await con.query(query);

		result.push(...recs.records);

		while (!recs.done) {
			recs = await con.queryMore(recs.nextRecordsUrl);
			result.push(...recs.records);
		}
	} catch (err) {
		console.error(err);
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error",
			"Failed to fetch records. Check console for details.",
			[],
		);
		return [];
	}
	console.log(result);
	return result;
}

export async function fetchCasesforCustomerCommentMiss(
	dateTime,
	dateTime1,
	qaSelector,
) {
	var done = false;
	var result = [];
	try {
		let con = await createConnection();
		var query =
			"SELECT Id, CreatedDate ,Parent.AccountId,Parent.IsClosed,Parent.Subject, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
			dateTime +
			" AND CreatedDate < " +
			dateTime1 +
			" AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','JP MCS')  AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') AND ((NOT CreatedBy.Email LIKE '%salesforce.com%') OR createdById='005300000075tiNAAQ')";
		var lastPartQuery = " ORDER BY CreatedDate DESC";
		if (qaSelector == "All") {
			query = query + lastPartQuery;
		} else {
			query = query + " AND Parent.IsClosed=true" + lastPartQuery;
		}

		var query2 =
			"SELECT TextBody, ParentId,FromAddress,CreatedDate,Parent.AccountId,Parent.Account.Name,Parent.CaseNumber,Parent.Case_Origin_OrgID__c,Parent.FunctionalArea__c,Parent.IsClosed FROM EmailMessage WHERE CreatedDate > " +
			dateTime +
			" AND CreatedDate < " +
			dateTime1 +
			" AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND FromAddress NOT IN('customersupport@salesforce.com','system@salesforce.com','no.reply@salesforce.com')";
		if (qaSelector == "All") {
			query2 = query2 + lastPartQuery;
		} else {
			query2 = query2 + " AND Parent.IsClosed=true" + lastPartQuery;
		}

		const result2 = await executeQuery(query2);
		var recs = await con.query(query);

		result.push(...recs.records);
		if (result2 && result2.records.length > 0) {
			result.push(...result2.records);
		}

		while (!recs.done) {
			recs = await con.queryMore(recs.nextRecordsUrl);
			result.push(...recs.records);
		}
	} catch (err) {
		console.log(err);
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Bad Request",
			"Something went wrong!!",
			[],
		);
		return [];
	}
	return result;
}

export async function fetchCasesforAlertsMiss(dateTime, dateTime1, qaSelector) {
	var done = false;
	var result = [];
	try {
		let con = await createConnection();
		var query =
			"SELECT Id, CreatedDate,Parent.ClosedDate,Parent.CreatedDate, Parent.AccountId, Parent.IsClosed, Parent.Subject, ParentId, Parent.FunctionalArea__c, Parent.CaseNumber, Parent.Account.Name, Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
			dateTime +
			" AND CreatedDate < " +
			dateTime1 +
			" AND CreatedById='" +
			GADGET_TEAM_USER_ID +
			"' AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS')";
		var lastPartQuery = " ORDER BY CreatedDate DESC";
		if (qaSelector == "All") {
			query = query + lastPartQuery;
		} else {
			query = query + " AND Parent.IsClosed=true" + lastPartQuery;
		}
		console.log(query);
		var recs = await con.query(query);

		result.push(...recs.records);

		while (!recs.done) {
			recs = await con.queryMore(recs.nextRecordsUrl);
			result.push(...recs.records);
		}
	} catch (err) {
		console.log(err);
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Bad Request",
			"Something went wrong!!",
			[],
		);
		return [];
	}
	return result;
}

export async function checkPublicComments(id, fromTime, endTime) {
	var query =
		"SELECT Id, CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
		fromTime +
		" AND CreatedDate < " +
		endTime +
		" AND ParentId ='" +
		id +
		"' AND IsPublished=true AND CreatedBy.Email LIKE'%salesforce.com%' AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') Order by CreatedDate Desc";

	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function checkFirstPublicComment(id, fromTime, endTime) {
	var query =
		"SELECT Id, CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
		fromTime +
		" AND CreatedDate < " +
		endTime +
		" AND ParentId ='" +
		id +
		"' AND IsPublished=true AND CreatedBy.Email LIKE'%salesforce.com%' AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') Order by CreatedDate Asc LIMIT 1";

	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function orgIdValidator(fromTime, endTime, teName) {
  let finalName="";
  
  var keys = [];
   for(var key in teName){
      keys.push(key);
   }
   finalName= keys[0];
  var result = [];
  try {
    let con = await createConnection();
    var query="";
    if(finalName){
      query =
      "SELECT Id, CreatedDate ,createdById,Parent.AccountId,Parent.Case_Origin_OrgID__c, ParentId,Parent.FunctionalArea__c,Parent.IsClosed, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
      fromTime +
      " AND CreatedDate < " +
      endTime +
      " AND IsPublished=true AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS') AND (NOT createdById='005300000027fZAAAY') AND   (NOT createdById='005Hx000001Q2FJIA0') AND CreatedBy.Email LIKE '%salesforce.com%' AND createdById='" + finalName +"' Order by CreatedDate Desc" ;

    }
    else {
      query =
      "SELECT Id, CreatedDate ,createdById,Parent.AccountId,Parent.Case_Origin_OrgID__c, ParentId,Parent.FunctionalArea__c,Parent.IsClosed, Parent.CaseNumber,Parent.Account.Name,Parent.Status, CommentBody FROM CaseComment WHERE CreatedDate > " +
      fromTime +
      " AND CreatedDate < " +
      endTime +
      " AND IsPublished=true AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS') AND (NOT createdById='005300000027fZAAAY') AND   (NOT createdById='005Hx000001Q2FJIA0') AND CreatedBy.Email LIKE '%salesforce.com%' Order by CreatedDate Desc" ;

    }
   
    var recs = await con.query(query);

    result.push(...recs.records);

    while (!recs.done) {
      recs = await con.queryMore(recs.nextRecordsUrl);
      result.push(...recs.records);
    }
  } catch (err) {
    console.log(err);
    createBasicNotification(
      "../views/css/slds/assets/icons/utility/error.svg",
      "Bad Request",
      "Something went wrong!!",
      []
    );
    return [];
  }
  return result;
}

export async function checkInternalComments(id, fromTime, endTime) {
	var query =
		"SELECT Id, ParentId,Parent.Account_Support_SBR_Category__c, Parent.Status, CreatedDate,Parent.CaseRoutingTaxonomy__r.Name, Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM CaseComment WHERE CreatedDate > " +
		fromTime +
		" AND CreatedDate < " +
		endTime +
		" AND CreatedById != '" +
		GADGET_TEAM_USER_ID +
		"' AND IsPublished = false AND ParentId='" +
		id +
		"' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT (CommentBody LIKE '%Case Age%' OR CommentBody LIKE '%Monitor for new alerts%' OR CommentBody LIKE '%Proactive Monitoring Global Handover%' OR CommentBody LIKE '%GHO%' OR CommentBody LIKE '%OrgCS Case ID%' OR CommentBody LIKE '%Hyperforce%' OR CommentBody LIKE '%https://orgcs.my.salesforce.com/%')) ORDER BY CreatedDate DESC";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs.records;
}

export async function fetchNewAlert(dateTime, userId) {
	//removed Parent.Reason and AND Parent.General_Application_Area__c='Alerts - Core' as the user will already have right cases
	var query =
		"SELECT Id, ParentId, Parent.Account_Support_SBR_Category__c, CreatedDate, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.AccountId,Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM  CaseComment WHERE CreatedDate >" +
		dateTime +
		" AND CreatedById='" +
		GADGET_TEAM_USER_ID +
		"' AND Parent.IsClosed=false AND IsPublished=false AND Parent.ownerId='" +
		userId +
		"' Order by CreatedDate Desc LIMIT 10 ";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function fetchNewCase() {
	var query =
		"SELECT Id,CaseNumber,AccountId,FunctionalArea__c,Case_Origin_OrgID__c,CreatedDate,Account.Name,Subject,Account_Support_SBR_Category__c,SupportLevel__c FROM case WHERE status in ('New','Working','Need More Information') AND owner.Name='Working in Org62' AND CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND Id !='500Hx00000CMk0UIAT' order by CreatedDate";
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}
export async function fetchReopenedCase() {
  // var query =
  //   "SELECT Id,CaseNumber,AccountId,FunctionalArea__c,Case_Origin_OrgID__c,CreatedDate,Account.Name,Subject,Account_Support_SBR_Category__c,SupportLevel__c FROM case WHERE status in ('New','Working','Need More Information') AND owner.Name='Working in Org62' AND CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND Id !='500Hx00000CMk0UIAT' order by CreatedDate";
  // let con = await createConnection();
  // const recs = await con.query(query);
  // return recs;

  const soqlQuery ="select Case.Id, Max(CreatedDate) maxDate from CaseHistory where case.CaseRoutingTaxonomy__r.Name= 'Platform-Proactive Monitoring' and Case.Reopen_count__c >0 and Case.Status='Working' group by Case.Id";
            
        let con = await createConnection();
        const recs = await con.query(soqlQuery);
       // return recs;
        // Execute the query
        // const result = await conn.query(soqlQuery);
         const caseHistoryRecords = recs.records;
         const latestRecords = [];
         for (const record of caseHistoryRecords) {
          const Id = record.Id;
          const maxDate = record.maxDate;
  
          const query = " SELECT Case.Id,Case.CaseNumber,Case.AccountId,Case.FunctionalArea__c,Case.Case_Origin_OrgID__c,Case.Account.Name,Case.Subject,Case.Account_Support_SBR_Category__c,Case.SupportLevel__c, OldValue,NewValue, CreatedDate FROM CaseHistory WHERE Case.Id = '"+ Id +"' AND CreatedDate ="+ maxDate +" order by CreatedDate DESC LIMIT 2";
          const history = await con.query(query);
          const historyRecords = history.records;
           if (historyRecords.length > 0) {
              latestRecords.push(historyRecords[0]);
             
          }
      }
      for(const values of latestRecords){
        
      }
      
      // for( const record of latestRecords){
      //   if(record.NewValue='Working' && record.OldVa)
      // }

        // // Filter records where OldValue is 'Closed' and NewValue is 'Working'
        const filteredRecords = latestRecords.filter(record => 
            record.OldValue === 'Closed' && record.NewValue === 'Working'
        );
        return filteredRecords;
        // // Sort the filtered records by CreatedDate in descending order
        // filteredRecords.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));

        // // Limit to 2 records
        // const limitedRecords = filteredRecords.slice(0, 2);

        // console.log('Filtered and limited records:', limitedRecords);
        // return limitedRecords;
        
}
export async function fetchCustomerComment(dateTime, userId) {
	var query1 =
		"SELECT Id, ParentId, CreatedDate, CommentBody, Parent.CaseNumber,  Parent.Subject, Parent.Status, Parent.FunctionalArea__c, Parent.Account.Name,Parent.Case_Origin_OrgID__c, Parent.AccountId,Parent.Owner.Name FROM  CaseComment WHERE CreatedDate > " +
		dateTime +
		" AND Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND ((NOT CreatedBy.Email LIKE'%salesforce.com%') OR createdById='005300000075tiNAAQ') AND CreatedById!='005300000027fZAAAY' AND Parent.Status != 'Closed' AND Parent.ownerId='" +
		userId +
		"' Order by CreatedDate Desc";

	const result1 = await executeQuery(query1);

	var query2 =
		"SELECT TextBody, ParentId,FromAddress,CreatedDate,Parent.AccountId,Parent.Account.Name,Parent.CaseNumber,Parent.Case_Origin_OrgID__c,Parent.FunctionalArea__c,Parent.IsClosed FROM EmailMessage WHERE CreatedDate > " +
		dateTime +
		" AND Parent.IsClosed=false AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND FromAddress NOT IN('customersupport@salesforce.com','system@salesforce.com','no.reply@salesforce.com') AND Parent.ownerId='" +
		userId +
		"' Order by CreatedDate Desc";

	const result2 = await executeQuery(query2);

	const combinedResults = [];

	if (result1 && result1.records.length > 0) {
		combinedResults.push(...result1.records);
	}

	if (result2 && result2.records.length > 0) {
		combinedResults.push(...result2.records);
	}

	console.log(combinedResults);

	return combinedResults;
}

async function executeQuery(query) {
	let con = await createConnection();
	const recs = await con.query(query);
	return recs;
}

export async function getNmiStatusCases(userid) {
	let conn = await createConnection();
	try {
		let query = await conn.query(
			"SELECT Id, CaseNumber,OwnerId,Owner.Name,Status, IsClosed FROM Case WHERE IsClosed = false and Status= 'Need More Information' and Sub_Status__c!='Customer-OOO' and Cloud__c = 'Platform-Proactive Monitoring' and Case_Owner__c='" +
				userid +
				"' and Subject LIKE '%PROACTIVE MONITORING NOTIFICATION%'",
		);

		return query.records;
	} catch (error) {
		console.log("Error in fetching nmi cases ", error);
	}
}

export async function fetchVoiceCallDataInLast8Hours(alert) {
	var firstpart =
		"SELECT Id,Case__c, CreatedDate,UserId, Account__c, Contact__c, FromPhoneNumber, ToPhoneNumber FROM VoiceCall WHERE ";
	let startTime = new Date(alert.CreatedDate);
	startTime.setHours(startTime.getHours() - 8);
	let startTimeISOString = startTime.toISOString();

	var wherePart =
		"Case__c = '" +
		alert.ParentId +
		"' AND CreatedDate <= " +
		alert.CreatedDate +
		" AND CreatedDate >= " +
		startTimeISOString;

	var query = firstpart + wherePart;
	let con = await createConnection();
	const recs = await con.query(query);
	if (recs.records && recs.records.length > 0) {
		return true;
	}

	return false;
}

export async function fetchNdnfInInternal(alert) {
	var query =
		"SELECT Id, ParentId,Parent.Account_Support_SBR_Category__c, Parent.Status, CreatedDate,Parent.CaseRoutingTaxonomy__r.Name, Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM CaseComment WHERE CreatedDate > " +
		alert.CreatedDate +
		" AND CreatedById != '" +
		GADGET_TEAM_USER_ID +
		"' AND IsPublished = false AND ParentId='" +
		alert.ParentId +
		"' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT (CommentBody LIKE '%Case Age%' OR CommentBody LIKE '%Monitor for new alerts%' OR CommentBody LIKE '%Proactive Monitoring Global Handover%' OR CommentBody LIKE '%GHO%' OR CommentBody LIKE '%OrgCS Case ID%' OR CommentBody LIKE '%Hyperforce%' OR CommentBody LIKE '%https://orgcs.my.salesforce.com/%')) ORDER BY CreatedDate ASC LIMIT 1";
	let con = await createConnection();
	const recs = await con.query(query);
	let result = fetchNDNFfromInternalComments(recs.records);
	return result;
}

export async function fetchNdnfInInternalInLast8Hours(alert) {
	let startTime = new Date(alert.CreatedDate);
	startTime.setHours(startTime.getHours() - 8);
	let startTimeISOString = startTime.toISOString();
	var query =
		"SELECT Id,Parent.Account_Support_SBR_Category__c, ParentId,Parent.CaseRoutingTaxonomy__r.Name, Parent.Status, CreatedDate, Parent.IsVisibleInSelfService, CommentBody, Parent.CaseNumber, Parent.Subject, Parent.FunctionalArea__c, Parent.Case_Origin_OrgID__c, Parent.Account.Name FROM CaseComment WHERE CreatedDate <= " +
		alert.CreatedDate +
		" AND CreatedDate >= " +
		startTimeISOString +
		" AND CreatedById != '" +
		GADGET_TEAM_USER_ID +
		"' AND IsPublished = false AND ParentId='" +
		alert.ParentId +
		"' AND Parent.Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','JP MCS','JP') AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT (CommentBody LIKE '%Case Age%' OR CommentBody LIKE '%Monitor for new alerts%' OR CommentBody LIKE '%Proactive Monitoring Global Handover%' OR CommentBody LIKE '%GHO%' OR CommentBody LIKE '%OrgCS Case ID%' OR CommentBody LIKE '%Hyperforce%' OR CommentBody LIKE '%https://orgcs.my.salesforce.com/%')) ORDER BY CreatedDate ASC LIMIT 10";
	let con = await createConnection();
	const recs = await con.query(query);
	let result = fetchNDNFfromInternalComments(recs.records);
	return result;
}

// POST Methods
export async function postInternalCommentOnAuditedCase(caseId) {
	let con = await createConnection();
	if (!con) {
		Logger.logEvent(
			PROQA_PROCESS_NAME,
			"Could not create JSForce Connection",
		);
		return;
	}
	return con.sobject("CaseComment").create({
		ParentId: caseId,
		CommentBody: PROM_CASE_AUDITED_TAG,
		IsPublished: false,
	});
}



export async function getEventsofCase(caseid) {
	try {
		let con = await createConnection();
		let eventOfCase = await con.query(
			"SELECT Id, Account.Name,Account_Support_SBR_Category__c,CaseRoutingTaxonomy__r.Name, CaseNumber, Subject ,Owner.Name, OwnerId  ,(SELECT Id, CreatedDate ,Subject, StartDateTime, EndDateTime , Location FROM Events Order by CreatedDate DESC )  FROM Case where Id = '" +
				caseid +
				"' AND (Subject LIKE '%Deployment%' OR Subject LIKE '%Monitoring%' OR Subject LIKE '%Sandbox%') AND (NOT((Subject LIKE '%NOTIFICATION%'))) AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','GOVT','JP MCS','JP') AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring' AND IsClosed =false ",
		);
		//console.log(eventOfCase.records);
		return eventOfCase.records;
	} catch (err) {
		console.log("error in function getEventsofCase " + err);
	}
}

export async function deploymentPublicComment(startTimeEvent, endTimeEvent) {
	try {
		let con = await createConnection();
		const deploymentPublicComment = await con.query(
			"SELECT Id, Account.Name, CaseNumber,Account_Support_SBR_Category__c,CaseRoutingTaxonomy__r.Name, Subject ,Owner.Name, OwnerId  ,(SELECT Id, Subject, StartDateTime, EndDateTime , Location FROM Events WHERE StartDateTime > " +
				startTimeEvent +
				" AND StartDateTime < " +
				endTimeEvent +
				")  FROM Case where (Subject LIKE '%Deployment%' OR Subject LIKE '%Monitoring%' OR Subject LIKE '%Sandbox%') AND (NOT((Subject LIKE '%NOTIFICATION%'))) AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','GOVT','JP MCS','JP') AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring' AND IsClosed =false",
		);
		//console.log(deploymentPublicComment.records);
		return deploymentPublicComment.records;
	} catch (err) {
		console.log("error in deploymentPublicComment>>" + err);
	}
}

export async function fetchDeploymentCaseOwner(id, createdTime) {
	// var dateObj1 = new Date(endTime);
	// dateObj1.setMinutes(dateObj1.getMinutes() + 8);
	// var updatedDateTime1 = dateObj1.toISOString();
	var query = `SELECT CaseId, CreatedById, CreatedDate, Field,OldValue, NewValue FROM CaseHistory WHERE CaseId = '${id}' AND Field='Owner' AND CreatedDate > ${createdTime}  ORDER BY CreatedDate DESC `;

	let con = await createConnection();
	const recs = await con.query(query);
	const filteredRecords = recs.records.filter(
		(record) => !record.NewValue.startsWith("005"),
	);
	// var result = fetchDeploymentOwnerNameFromCaseHistory(filteredRecords);

	return filteredRecords;
}

export async function fetchCombinedCaseDetails(dateStart,dateEnd) {
	
	// Define the first query to fetch case details
	let con = await createConnection();
	const deploymentPublicComment = await con.query(
		"SELECT Id, Account.Name, CaseNumber,Account_Support_SBR_Category__c,CaseRoutingTaxonomy__r.Name, Subject ,Owner.Name, OwnerId  ,(SELECT Id, Subject, StartDateTime, EndDateTime , Location FROM Events WHERE StartDateTime > " +
			dateStart +
			" AND EndDateTime < " +
			dateEnd +
			")  FROM Case where (Subject LIKE '%Deployment%' OR Subject LIKE '%Data Load%' OR Subject LIKE '%Sandbox%') AND (NOT((Subject LIKE '%NOTIFICATION%'))) AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','GOVT','JP MCS','JP') AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring'",
	);

	// Create a connection and fetch case records

	const caseRecords = deploymentPublicComment;

	// Initialize an array to hold the combined results
	let combinedResults = [];
	let i = 0;
	let continueLoop = true;

	// Loop through each case and fetch the related CaseHistory records
	do {
		const caseRecord = caseRecords.records[i];
		const caseId = caseRecord.Id;

		const caseHistoryQuery = `
      SELECT CaseId, CreatedById, CreatedDate, Field, OldValue, NewValue 
      FROM CaseHistory 
      WHERE CaseId = '${caseId}' 
        AND Field = 'Owner' 
        AND CreatedDate > ${dateStart} 
      ORDER BY CreatedDate ASC
    `;

		const caseHistoryRecords = await con.query(caseHistoryQuery);

		// Filter out records where NewValue starts with '00'
		const filteredHistoryRecords = caseHistoryRecords.records.filter(
			(record) => record.NewValue && !record.NewValue.startsWith("00"),
		);

		const caseHistoryMap = {};
		filteredHistoryRecords.forEach((record) => {
			if (!caseHistoryMap[record.CaseId]) {
				caseHistoryMap[record.CaseId] = [];
			}
			caseHistoryMap[record.CaseId].push(record);
		});

		// Combine the case details with the filtered case history details
		let combinedRecord = {
			...caseRecord,
			caseHistory: filteredHistoryRecords,
		};

		combinedResults.push(combinedRecord);

		// Increment the index
		i++;
		if (i >= caseRecords.records.length) {
			continueLoop = false;
		}
		//console.log(i);
	} while (continueLoop);

	//console.log(i);
	return combinedResults;
}

export async function checkDeploymentPublicComments(id, fromTime, endTime) {
	var query =
		"SELECT CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Owner.Name,Parent.Status,CommentBody FROM CaseComment WHERE CreatedDate > " +
		fromTime +
		" AND CreatedDate < " +
		endTime +
		" AND ParentId ='" +
		id +
		"' AND IsPublished=true AND CreatedBy.Email LIKE'%salesforce.com%' AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') AND (NOT (CommentBody LIKE '%Proactive Monitoring Global Handover%' ) )AND (NOT (CommentBody LIKE '%has been assigned to you%') ) Order by CreatedDate ASC";

	let con = await createConnection();
	const recs = await con.query(query);

	return recs;
}

export async function checkDeploymentInternalComments(id, fromTime, endTime) {
	var query =
		"SELECT CreatedDate ,Parent.AccountId, ParentId, Parent.CaseNumber,Parent.Account.Name,Parent.Owner.Name,Parent.Status,CommentBody FROM CaseComment WHERE CreatedDate > " +
		fromTime +
		" AND CreatedDate < " +
		endTime +
		" AND ParentId ='" +
		id +
		"' AND IsPublished=false AND CreatedBy.Email LIKE'%salesforce.com%' AND Parent.CaseRoutingTaxonomy__r.Name='Platform-Proactive Monitoring' AND (NOT createdById='005300000027fZAAAY') AND (NOT (CommentBody LIKE '%Proactive Monitoring Global Handover%' ) )AND (NOT (CommentBody LIKE '%has been assigned to you%') ) AND (CommentBody LIKE '%no deployment%' ) AND (CommentBody LIKE '%Deployment%' ) AND (CommentBody LIKE '%DEPLOYMENT%' ) AND (CommentBody LIKE '%Deployment%' ) Order by CreatedDate ASC";

	let con = await createConnection();
	const recs = await con.query(query);

	return recs;
}

export async function getDeploymentCasesService(query) {
	try {
		let con = await createConnection();
		const deployCases = await con.query(
			`SELECT Id, Account.Name, CaseNumber,Account_Support_SBR_Category__c,CaseRoutingTaxonomy__r.Name, Subject ,Owner.Name, OwnerId  ,(SELECT Id, Subject, StartDateTime, EndDateTime , Location FROM Events Order by StartDateTime DESC )  FROM Case where  (NOT((Subject LIKE '%NOTIFICATION%'))) AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','GOVT','JP MCS','JP') AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring' AND IsClosed =false ${query}` ,
			
			//OwnerId = '" +user_id +"'
		);
		return deployCases.records;
	} catch (err) {
		console.log("error in getDeploymentCasesService>>" + err);
	}
}

// this query is for deployment cases handover to other GOs
// Start
export async function getDeploymentCaseForGHO() {
	try {
		let conn = await createConnection();
		let deploymentGHOCases = await conn.query(
			"SELECT Id, Account.Name, CaseNumber, Subject ,Owner.Name, OwnerId ,(SELECT Id, Subject, StartDateTime, EndDateTime , Location FROM Events  Order by StartDateTime DESC )  FROM Case where Subject LIKE '%Deployment%' AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring' AND IsClosed =false",
		);
		console.log(deploymentGHOCases.records);
		return deploymentGHOCases.records;
	} catch (err) {
		console.log("Error in function getDeploymentCaseForGHO>>>", err);
	}
}
// End

// this queries are for GHO page
// start

export async function getAllPromCasesForGho(userId) {
	let conn = await createConnection();
	try {
		let getAllCasesGho = await conn.query(
			"SELECT ID FROM CASE WHERE OwnerId='" +
				userId +
				"'" +
				" AND IsClosed=false AND Cloud__c = 'Platform-Proactive Monitoring'  Order by CreatedDate Desc LIMIT 9999 ",
		);
		return getAllCasesGho.records;
	} catch (error) {
		console.log("Error in fetching all case for gho ", error);
	}
}

//query that is using to fetch eligible cases for gho
export async function getCommentedCaseGho(userId, dateTime) {
	let conn = await createConnection();
	try {
		let ownersCommentedCases = await conn.query(
			"SELECT ParentId, Parent.CaseNumber FROM  CaseComment WHERE CreatedDate >" +
				dateTime +
				" AND  ( CreatedById ='" +
				userId +
				"') AND Parent.IsClosed=false AND Parent.Cloud__c = 'Platform-Proactive Monitoring'   AND (Parent.ownerId='" +
				userId +
				"') Order by CreatedDate Desc LIMIT 9999 ",
		);
		return ownersCommentedCases.records;
	} catch (error) {
		console.log("Error in fetching commented cases for gho ", error);
	}
}

// end of GHO

// Jsforce connection creator
export async function createConnection() {
	let session = await getSalesforceAuthContext();
	if (!session.orgcs) {
		// raise exception msg
		createBasicNotification(
			"../views/css/slds/assets/icons/utility/error.svg",
			"Error occured !!",
			"OrgCS Session expired. Please re-login to OrgCS.",
			[],
		);
		return;
	}
	try {
		let conn_orgcs = new jsforce.Connection({
			serverUrl: ORGCS_DOMAIN_NAME,
			sessionId: session.orgcs,
		});
		if (conn_orgcs) {
			return conn_orgcs;
		} else {
			return null;
		}
	} catch (err) {
		console.log(err);
	}
}

// Added by Sandeep for WI-02
//@param {String} = `AND (CreatedDate > ${dateTime})``AND (Parent.ownerId='${userId}')`

export async function getCasesWithHandover(query) {
	var result = [];
	try {
		let conn = await createConnection();
		let customerCommentCases = await conn.query(
			`SELECT parent.CaseNumber, parent.Owner.Name, parent.Id,CreatedDate,CommentBody,Parent.Account.Name ,Parent.FunctionalArea__c  FROM CaseComment WHERE parent.IsClosed = false AND Parent.ServiceContract__c not in ('Signature Success - Gov Cloud', 'Signature Success - US Only') AND  Parent.Account_Support_SBR_Category__c not in ('MCS - US only - GOVT','JP MCS','MCS - GOVT','JP','GOVT')  AND Parent.CaseRoutingTaxonomy__r.name ='Platform-Proactive Monitoring' AND (CommentBody like '%INTERNAL_PROM_GEO_HANDOVER%') AND IsPublished = false  ${query} ORDER BY createdDate desc LIMIT 9999`,
		);

		result.push(...customerCommentCases.records);

		return result;
	} catch (er) {
		console.log("Error in function getCasesWithHandover>>>", er);
	}
}




/// Deprecated


// export async function myDeploymentCases(user_id) {
// 	try {
// 		let con = await createConnection();
// 		let mydeployCases = await con.query(
// 			"SELECT Id, Account.Name,Account_Support_SBR_Category__c,CaseRoutingTaxonomy__r.Name, CaseNumber, Subject ,Owner.Name, OwnerId  ,(SELECT Id, Subject, StartDateTime, EndDateTime , Location FROM Events Order by StartDateTime DESC )  FROM Case where OwnerId = '" +
// 				user_id +
// 				"' AND (Subject LIKE '%Deployment%' OR Subject LIKE '%Monitoring%' OR Subject LIKE '%Sandbox%') AND (NOT((Subject LIKE '%NOTIFICATION%'))) AND Account_Support_SBR_Category__c NOT IN ('MCS-GOVT','MCS - GOVT','MCS - US only - GOVT','US only','GOVT','JP MCS','JP') AND CaseRoutingTaxonomy__r.Name = 'Platform-Proactive Monitoring' AND IsClosed =false",
// 		);
// 		console.log(mydeployCases.records);
// 		return mydeployCases.records;
// 	} catch (err) {
// 		console.log("error in function myDeploymentCases " + err);
// 	}
// }