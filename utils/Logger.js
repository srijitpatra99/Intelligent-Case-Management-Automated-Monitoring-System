class Logger {
  static logEvent (processName, logMessage) {
    // Create or retrieve the log file for the process
    let logFileName = `log_${processName}`;
    let logFile = localStorage.getItem (logFileName);

    if (!logFile) {
      // If the log file doesn't exist, create a new one
      logFileName = `log_${processName}`;
      logFile = '';
    }

    // Append the log message with a timestamp
    const timestamp = new Date ().toLocaleString ();
    const formattedMessage = `[${timestamp}] ${logMessage}\n`;
    logFile += formattedMessage;

    // Update the log file in the local storage
    localStorage.setItem (logFileName, logFile);
  }

  static downloadLogFile (processName) {
    let logFileName = `log_${processName}`;
    const logFileContent = localStorage.getItem (logFileName);

    // Create a temporary anchor element
    const anchor = document.createElement ('a');
    anchor.href = `data:text/plain;charset=utf-8,${encodeURIComponent (logFileContent)}`;
    anchor.download = `${logFileName}.txt`;

    // Trigger the download
    anchor.click ();

    // Clean up the temporary anchor element
    anchor.remove ();
  }
}

export default Logger;
