import {
  fetchCaseComments,
  fetchOpenPromCases,
  searchCaseCommentsByCommentBody,
} from '../service/salesforceService.js';
import {getCurrentAuthContext} from '../utils/auth.js';
import {populateNavbarUserData} from '../utils/commonUtils.js';
import {GADGET_TEAM_USER_ID} from '../utils/constants.js';

document.addEventListener ('DOMContentLoaded', function () {
  populateNavbarUserData ();
  const spinner = document.getElementById ('my-spinner');
  spinner.style.display = 'None';

  const managerView = document.getElementById ('manager-view');
  const nonManagerView = document.getElementById ('non-manager-view');

  managerView.style.display = 'None';

  getCurrentAuthContext ().then (currentAuthContext => {
    if (currentAuthContext.role.toLowerCase ().includes ('manager')) {
      managerView.style.display = 'block';
      nonManagerView.style.display = 'None';
    } else {
      managerView.style.display = 'None';
      nonManagerView.style.display = 'block';
    }
  });

  //calculateProMAlertMisses ();
});

async function calculateProMAlertMisses () {
  let promCases = await fetchOpenPromCases ();

  if (!promCases || promCases.records.length == 0) {
    console.log ('No ProM cases found');
    return;
  }
  promCases = promCases.records;

  // const promCaseIds = promCases.map (record => record.Id);
  // let searchTerm = `Gadget Diagnostic Request Details\\: https\\://gadget.prom.sfdc.sh/diagnostics/`;
  // let searchResults = await searchCaseCommentsByCommentBody (
  //   searchTerm,
  //   promCaseIds
  // );
  // console.log (searchResults);
  let startTime = new Date ();
  let caseToCommentMapping = new Map ();
  for (let i = 0; i < promCases.length; i++) {
    console.log (`Fetching Case Data : ${i + 1}`);
    const promCase = promCases[i];
    let now = new Date ();
    let fromTime = new Date ();
    fromTime.setDate (now.getDate () - 1);

    const caseComments = await fetchCaseComments (
      promCase.Id,
      'internal',
      GADGET_TEAM_USER_ID,
      fromTime.toISOString (),
      promCase.ClosedDate,
      null,
      'CreatedDate',
      'ASC'
    );
    caseToCommentMapping.set (promCase.CaseNumber, caseComments);
  }
  console.log (caseToCommentMapping);
  let endTime = new Date ();
  let timeElapsed = endTime - startTime;
  console.log (`Elapsed: ${timeElapsed / 1000} seconds`);
}
