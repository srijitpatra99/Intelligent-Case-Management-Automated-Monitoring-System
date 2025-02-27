// Import required JS to current Path
import { getCurrentAuthContext } from "../utils/auth.js";
import { populateNavbarUserData } from "../utils/commonUtils.js";
import { createBasicNotification } from "../service/notificationService.js";
import { memberIdMap, memberUserIdMap } from "../utils/constants.js";

import { getKeyFromStorage } from "../service/localStorage.js";
import {
	getLoggedInUserData,
	createConnection,
} from "../service/salesforceService.js";

let parentIdOfCase = undefined;

var CaseList = [];

//DOM ContentLoad which will run at first once the html content is loaded
document.addEventListener("DOMContentLoaded", function () {
	console.log(" on DOMContentLoaded");

	getKeyFromStorage("geo").then((res) => (currentGEOoftheUser = res));

	// select element -- 16 hour, 1 day
	document.getElementById("getView").addEventListener("change", () => {});

	document.getElementById("my-spinner").style.display = "none";

	let currentAuthContext;
	populateNavbarUserData();

	getCurrentAuthContext().then((result) => {
		currentAuthContext = result;
		console.log("currentAuthContext>>>>", currentAuthContext);
		if (currentAuthContext != null) {
			let role = currentAuthContext.role;
			let emailId = currentAuthContext.email;
		}
	});

	let getCases = document.getElementById("getCases");

	// get cases button after select element
	getCases.addEventListener("click", function () {
		CaseList = [];
		document.getElementById("my-spinner").style.display = "block";

		console.log("fetching  cases...");

		let viewValue = document.getElementById("getView").value;
		if (viewValue == "selectView") {
			createBasicNotification(
				"../views/css/slds/assets/icons/standard/insights_120.png",
				"Uh-oh",
				"Please Select Manager view or TE view to get cases",
				[],
			);
			document.getElementById("my-spinner").style.display = "none";
		} else getPendingCaseDetails();
	});

	// internal comment on case
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
				parentIdOfCase,
			);
	});
});
