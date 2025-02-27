// const urlParams = new URLSearchParams (window.location.search);
// const json = urlParams.get ('comment');

// console.log (json);

// // Parse the JSON string to get the object
// const commentDetailList = JSON.parse (decodeURIComponent (json));

// if (commentDetailList) {
//   document.title = `View ${commentDetailList[0].commentType} Comment - ${commentDetailList[0].caseNumber}`;

//   const pageHeaderMsg = document.getElementById ('page-msg');
//   pageHeaderMsg.innerHTML = commentDetailList[0].commentType ===
//     'Case Description'
//     ? `<h1>Showing ${commentDetailList[0].commentType} on case <b><u>${commentDetailList[0].caseNumber}</u></b></h1>`
//     : `<h1>Showing ${commentDetailList[0].commentType} comments posted by <b><u>${commentDetailList[0].creator}</u></b> during their ownership</h1>`;

//   commentDetailList.forEach (element => {
//     let commentContainer = document.createElement ('p');
//     commentContainer.innerText = element.CommentBody;
//     commentContainer.classList.add ('card', 'm-4', 'p-4');
//   });

//   const output = document.getElementById ('output');
//   commentDetailList.forEach (item => {
//     const li = document.createElement ('li');
//     li.innerText = item.commentText;
//     li.classList.add ('card');
//     li.classList.add ('m-4');
//     li.classList.add ('p-4');
//     output.appendChild (li);
//   });
// }
const urlParams = new URLSearchParams(window.location.search);
const json = urlParams.get('comment');

// Debug: log the fetched JSON string from URL
console.log('Fetched JSON:', json);

// Parse the JSON string to get the object
const commentDetailList = JSON.parse(json);

if (commentDetailList && commentDetailList.length > 0) {
  // Set the document title dynamically based on the comment type and case number
  document.title = `View ${commentDetailList[0].commentType} Comment - ${commentDetailList[0].caseNumber}`;

  // Dynamically set the page header message based on the comment type
  const pageHeaderMsg = document.getElementById('page-msg');
  pageHeaderMsg.innerHTML = commentDetailList[0].commentType === 'Case Description'
    ? `<h1>Showing ${commentDetailList[0].commentType} on case <b><u>${commentDetailList[0].caseNumber}</u></b></h1>`
    : `<h1>Showing ${commentDetailList[0].commentType} comments posted by <b><u>${commentDetailList[0].creator}</u> on ${commentDetailList[0].caseNumber} </b> during their ownership</h1>`;

  // Loop through commentDetailList and create DOM elements to display the comments
  const output = document.getElementById('output');
  
  commentDetailList.forEach(element => {
    const li = document.createElement('li');
    li.innerText = element.commentText; // Use 'commentText' property
    li.classList.add('card', 'm-4', 'p-4');
    output.appendChild(li); // Append each item to the output container
  });
} else {
  // Handle the case where no comments are available
  console.error('No valid comments found in the URL or failed to parse.');
  const pageHeaderMsg = document.getElementById('page-msg');
  pageHeaderMsg.innerHTML = `<h1>No comments available for this case</h1>`;
}