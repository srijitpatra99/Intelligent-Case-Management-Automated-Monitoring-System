import {
  populateNavbarUserData,
  showErrorPopup,
} from "../utils/commonUtils.js";

// Please remember to import this js as a module in corresponding html file
import {
  saveToLocalStorage,
  getKeyFromStorage,
} from "../service/localStorage.js";

import { createBasicNotification } from "../service/notificationService.js";
import { PROM_MASTER_TOOL_NAME } from "../utils/constants.js";
import { getLoggedInUserData } from "../service/salesforceService.js";

document.addEventListener("DOMContentLoaded", function () {
  populateNavbarUserData();
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const geoSelect = document.getElementById("geo");
  const roleSelect = document.getElementById("role");
  const teamChannelSelect = document.getElementById("team-channel");
  const newCaseAlertsInput = document.getElementById("new-case-alerts");
  const newCommentAlertsInput = document.getElementById("new-comment-alerts");
  const profileSavedStatus = document.getElementById("profile-saved-state");
  const spinner = document.getElementById("my-spinner");
  spinner.style.display = "none";

  let isExisitingProfile = false;

  if (getKeyFromStorage("name") != null && getKeyFromStorage("email") != null) {
    isExisitingProfile = true;
    profileSavedStatus.innerText =
      "Existing Profile found. Below are the details";
    profileSavedStatus.classList.add("sub-header", "mt-2");
  } else {
    profileSavedStatus.innerText =
      "No Existing Profile found. Please edit the below form and save your details";
  }

  if (isExisitingProfile) {
    getKeyFromStorage("name").then((res) => {
      nameInput.value = res;
    });
    getKeyFromStorage("email").then((res) => {
      emailInput.value = res;
    });
    getKeyFromStorage("geo").then((res) => {
      geoSelect.value = res;
    });
    getKeyFromStorage("role").then((res) => {
      roleSelect.value = res;
    });
    getKeyFromStorage("teamChannel").then((res) => {
      teamChannelSelect.value = res;
    });
    getKeyFromStorage("isNewCaseAlertActive").then((res) => {
      newCaseAlertsInput.checked = res;
    });
    getKeyFromStorage("isNewCommentAlertActive").then((res) => {
      newCommentAlertsInput.checked = res;
    });
  }

  editBtn.addEventListener("click", () => {
    editBtn.classList.add("d-none");
    saveBtn.classList.remove("d-none");
    nameInput.removeAttribute("readonly");
    emailInput.removeAttribute("readonly");
    geoSelect.removeAttribute("disabled");
    roleSelect.removeAttribute("disabled");
    teamChannelSelect.removeAttribute("disabled");
    newCaseAlertsInput.removeAttribute("disabled");
    newCommentAlertsInput.removeAttribute("disabled");
  });

  saveBtn.addEventListener("click", () => {
    editBtn.classList.remove("d-none");
    saveBtn.classList.add("d-none");
    nameInput.setAttribute("readonly", true);
    emailInput.setAttribute("readonly", true);
    geoSelect.setAttribute("disabled", true);
    roleSelect.setAttribute("disabled", true);
    teamChannelSelect.setAttribute("disabled", true);
    newCaseAlertsInput.setAttribute("disabled", true);
    newCommentAlertsInput.setAttribute("disabled", true);
    let profileUpdate = {
      name: nameInput.value,
      email: emailInput.value,
      geo: geoSelect.value,
      role: roleSelect.value,
      teamChannel: teamChannelSelect.value,
      isNewCaseAlertActive: newCaseAlertsInput.checked,
      isNewCommentAlertActive: newCommentAlertsInput.checked,
    };

    saveToLocalStorage(profileUpdate).then((result) => {
      console.log("Profile Update Successfully", result);
      createBasicNotification(
        "../views/css/slds/assets/icons/standard/insights_120.png",
        "Profile Update Successfull",
        "Success !! Your local profile has been saved successfully.",
        []
      );
      getLoggedInUserData().then((data) => {
        console.log(data);
      });
    });
    setTimeout(() => {
      this.location.reload();
    }, 1500);

    showErrorPopup("Successfully updated", true);
  });
});
