const combatDetailsFrame = document.getElementById("combat-details");
let reportHandle;
let reportSize;
let reportReading = false;

function publishCombatDetailsFile(file, handle) {
  if (combatDetailsFrame.hidden) return;
  if (reportHandle === handle && reportSize === file.size) return;
  sendCombatDetailsFile(handle, true, file);
}

async function sendCombatDetailsFile(handle, automatic, file) {
  // The next log poll picks up changes that arrive during this read.
  if (reportReading) return;
  reportReading = true;
  reportHandle = handle;
  reportSize = file?.size;
  const send = (message) => combatDetailsFrame.contentWindow.postMessage(message, "*");
  try {
    const reportFile = handle.getReportFile ? await handle.getReportFile() : (file || await handle.getFile());
    if (fileHandle !== handle) return;
    if (!file && !handle.getReportFile) reportSize = reportFile.size;
    send({ type: "wakfu-report-file", file: reportFile, automatic });
  } catch (error) {
    if (fileHandle !== handle) return;
    reportSize = undefined;
    if (!automatic) send({ type: "wakfu-report-error" });
  } finally {
    reportReading = false;
  }
}

window.addEventListener("message", async (event) => {
  if (event.source !== combatDetailsFrame.contentWindow || event.origin !== "null") return;
  const request = event.data?.type;
  if (request !== "wakfu-report-ready" && request !== "wakfu-report-read") return;

  // The report is sandboxed with an opaque origin. Only its own window gets the file.
  const send = (message) => event.source.postMessage(message, "*");
  const handle = fileHandle;
  send({ type: "wakfu-report-status", connected: Boolean(handle) });
  if (!handle || combatDetailsFrame.hidden) return;

  await sendCombatDetailsFile(handle, event.data.automatic === true);
});
