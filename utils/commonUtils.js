import { getLoggedInUserData } from "../service/salesforceService.js";
import { getCurrentAuthContext } from "./auth.js";

let errorMessage = document.getElementById("errorMessage");
let closeErrorButton = document.getElementById("close");

export function showErrorPopup(errors, check) {
  document.getElementById("toast").style.display = "block";
  if (check) {
    document.getElementById("statuses").style.backgroundColor = "green";
  } else {
    document.getElementById("statuses").style.backgroundColor = "red";
  }

  errorMessage.innerHTML = errors;
  closeErrorButton.addEventListener("click", function () {
    document.getElementById("toast").style.display = "none";
  });
}

export function fetchAlertOwnerFromLastLine(data) {
  let lastPart = "nonono";

  for (const record of data) {
    if (!(record.Body === null || record.Body.trim() === "")) {
      let recordLastPart = record.Body.substring(
        record.Body.lastIndexOf("@") + 1
      );
      let lastIndexOfAt = record.Body.lastIndexOf("@");

      if (lastIndexOfAt >= 0) {
        lastPart = recordLastPart;
      }
    }
  }

  return lastPart;
}

export function fetchSHIFromCaseFeed(data) {
  var lastPart = false;
  var phoneRegex = /(\d{1,})/g;
  var phoneNums = [];
  data.forEach((record) => {
    if (!(!record.Body || record.Body == null || record.Body.trim() === "")) {
      phoneNums = record.Body.match(phoneRegex);
      if (phoneNums) {
        if (phoneNums.length > 1 || phoneNums[0].length > 1)
          lastPart = record.Body.includes("Special");
      }
    }
  });

  if (lastPart) return true;
  else return false;
}

export function fetchNDNFfromInternalComments(data) {
  var bool;
  data.forEach((comment) => {
    if (
      comment.CommentBody &&
      comment.CommentBody.toUpperCase().includes("NDNF")
    ) {
      bool = true;
    }
  });
  if (bool) return true;
  else return false;
}

export function fetchOwnerNameFromCaseHistory(records) {
  if (records[0] == undefined) {
    return "MISS";
  } else {
    if (records[0].NewValue != "Sig Holding User") {
      var alertOwnerName = records[0].NewValue;
    } else {
      var alertOwnerName = records[0].OldValue;
    }

    return alertOwnerName;
  }
}

export function fetchDeploymentOwnerNameFromCaseHistory(records) {
  for (let i = 0; i < records.length; i++) {
    if (!records[i].NewValue.startsWith("005")) {
      return records[i].NewValue;
    } else if (!records[i].OldValue.startsWith("005")) {
      return null;
    }
  }
  return "MISS";
}

var timer;
export function getClosureBounds() {
  /*
    This method calculates the upper bound and lower bound of ClosedDate for closed cases.
    For QA, last weeks cases are audited,
    so the lower bound for ClosedDate will be the Last Week's Monday and upper bound for ClosedDate will be Last Week's Friday
    Logic ->
    To get the last Monday -> today's date - (7 + (today's day - 1))
    To get the last Friday -> today's date - ((today's day + 2))

    Return type -> This method will return an array (bounds) consisting of 2 Date items,
    bounds[0] - lower bound for ClosedDate (i.e last week's Monday)
    bounds[1] - upper bound for ClosedDate (i.e last week's Friday)

    */
  let bounds = [];
  let today = new Date();

  // ignoring weekends
  // if (today.getDay () != 0 && today.getDay () != 6) {
  let lowerBound = new Date();
  let upperBound = new Date();
  lowerBound.setDate(today.getDate() - (7 + (today.getDay() - 1)));
  upperBound.setDate(today.getDate() - (today.getDay() + 2));
  bounds.push(lowerBound.toISOString());
  bounds.push(upperBound.toISOString());
  // }

  return bounds;
}

export function getRandomNoOfElementsFromArray(arr, n) {
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  if (n > len) {
    n = len;
  }
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

export function copyTableToClipboard(tableId) {
  // Get the table element
  var table = document.getElementById(tableId);

  // Create a temporary container element
  var container = document.createElement("div");

  // Create a new empty document to store the selected table cells
  var selectedTable = document.createElement("table");

  // Loop through the table rows (excluding the header row)
  for (var i = 1; i < table.rows.length; i++) {
    // Clone the row
    var clonedRow = table.rows[i].cloneNode(true);

    // Append the cloned row to the selected table
    selectedTable.appendChild(clonedRow);
  }

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

export function showLoadingSpinner(stageVal) {
  // Only show the spinner and stage text if a stage is provided
  if (stageVal) {
    // Disable scrolling to prevent users from interacting with the page during loading
    document.body.classList.add("no-scroll");

    // Get the elements for the spinner, stage, and ETA
    const spinner = document.getElementById("my-spinner");
    const stage = document.getElementById("stage-label");
    
    // Show the spinner and stage text
    spinner.style.display = "block";
    stage.style.display = "block";

    // Set the stage text to indicate the current stage of the process
    stage.textContent = `${stageVal}...`;
  }
}

// Call this function when your process is complete to hide the spinner
export function hideLoadingSpinner() {
  // Re-enable scrolling
  document.body.classList.remove("no-scroll");

  // Get the elements for the spinner and stage
  const spinner = document.getElementById("my-spinner");
  const stage = document.getElementById("stage-label");
  
  // Hide the spinner and stage text
  spinner.style.display = "none";
  stage.style.display = "none";
}

export function extractDataFromCaseHistory(caseHistory, fieldName, oldValue) {
  let result;

  switch (fieldName) {
    case "Owner":
      caseHistory.forEach((element) => {
        if (
          element.Field == "Owner" &&
          element.OldValue == oldValue &&
          element.NewValue != null
        ) {
          result = element;
          return;
        }
      });
      break;

    case "Email_Sent_to__c":
      caseHistory.forEach((element) => {
        if (
          element.Field == "Email_Sent_to__c" &&
          element.OldValue == null &&
          element.NewValue != null
        ) {
          result = element.NewValue;
          return;
        }
      });
      break;

    case "Status":
      caseHistory.forEach((element) => {
        // if(element.Field == "Status"){
        //   console.log(element.OldValue+" "+element.NewValue);
        // }
        // console.log(element);
        if (
          element.Field == "Status" &&
          element.OldValue == "New" &&
          element.NewValue == "Working"
        ) {
          result = true;
          return;
        } else if (
          element.Field == "Status" &&
          element.OldValue == "Working" &&
          element.NewValue == "Need More Information"
        ) {
          result = true;
          return;
        } else if (
          element.Field == "Status" &&
          element.OldValue == "Working" &&
          element.NewValue == "Solution Provided"
        ) {
          result = true;
          return;
        } else if (
          element.Field == "Status" &&
          element.OldValue == "New" &&
          element.NewValue == "Solution Provided"
        ) {
          result = true;
          return;
        } else {
          result = true;
          return;
        }
      });
      break;

    case "Last_Public_Activity_Date_Time__c":
      caseHistory.forEach((element) => {
        if (
          element.Field == "Last_Public_Activity_Date_Time__c" &&
          element.OldValue == null &&
          element.NewValue != null
        ) {
          result = element.NewValue;
          return;
        }
      });
      break;

    case "IsVisibleInSelfService":
      caseHistory.forEach((element) => {
        if (
          element.Field == "IsVisibleInSelfService" &&
          element.OldValue == false &&
          element.NewValue == true
        ) {
          result = element.NewValue;
          return;
        }
      });
      break;
  }

  return result;
}

export function extractClosureTagnamesFromComment(internalClosureComment) {
  if (!internalClosureComment) {
    return null;
  }
  const regex = /#\w+/g;
  const matches = internalClosureComment.match(regex);
  let tags = "";
  if (matches) {
    matches.forEach((match) => {
      tags += `${match}, `;
    });
    // remove end ',' and ' ' (space)
    tags.slice(0, -2);
  }
  return tags;
}

export function testIfInitialComment(text) {
  // const pattern1 = /^Hi Team,\n\nWe have received a (\w+) which is a (\w+) alert for your org: (\w+) Evaluated At: (\w+)\n\nWe are investigating the details and will update you shortly$/;
  // const pattern2 = /^[Need More Information] Hi Team,\n\nWe have received a (\w+) which is a (\w+) alert for your org: (\w+) Evaluated At: (\w+)\n\nWe are investigating the details and will update you shortly$/;
  // return pattern1.test (text) || pattern2.test (text);
  return (
    text.includes("Hi Team") &&
    text.includes("We have received a") &&
    text.includes("alert for your org:") &&
    text.includes("Evaluated At:") &&
    text.includes(
      "We are investigating the details and will update you shortly"
    )
  );
}

export async function populateNavbarUserData() {
  const userNameElement = document.getElementById("user-name");
  const profilePic = document.getElementById("profile-pic");
  const loggedInStatus = document.getElementById("logged-in-status-dot");
  const currentShift = document.getElementById("current-shift");

  let currentAuthContext = await getCurrentAuthContext();
  if (currentAuthContext != null) {
    let userName = currentAuthContext.name;
    userNameElement.innerText = userName;
    userNameElement.classList.add("sub-header");
    currentShift.innerText = currentAuthContext.geo.toUpperCase();
  }
  let loggedInUserData = await getLoggedInUserData();
  if (loggedInUserData) {
    let profilePicUrl = loggedInUserData.photos.picture;
    profilePic.setAttribute("src", profilePicUrl);
    loggedInStatus.classList.add("dot-logged-in");
  }
}

export function extractErrorCountFromComment(comment) {
  const regex = /(\d{1,3}(?:,\d{2,3})*(?:,\d{3})*)(?=\serrors)/; // Match numbers with optional commas before " errors"

  const match = comment.match(regex);
  if (match) {
    const number = parseInt(match[1].replace(/,/g, ""));
    return number;
  }
}

export function convertToIST(commentDate) {
  var hours = commentDate.getHours(); // gives the value in 24 hours format
  var AmOrPm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  var minutes = commentDate.getMinutes();
  minutes = minutes <= 9 ? "0" + minutes : minutes;
  var finalTime = " " + hours + ":" + minutes + " " + AmOrPm;
  return finalTime;
}
