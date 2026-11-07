const combatDetailsFrame = document.getElementById("combat-details");

window.addEventListener("message", async (event) => {
  if (event.source !== combatDetailsFrame.contentWindow || event.origin !== "null") return;
  const request = event.data?.type;
  if (request !== "wakfu-report-ready" && request !== "wakfu-report-read") return;

  // The report is sandboxed with an opaque origin. Only its own window gets the file.
  const send = (message) => event.source.postMessage(message, "*");
  const handle = fileHandle;
  send({ type: "wakfu-report-status", connected: Boolean(handle) });
  if (!handle || combatDetailsFrame.hidden) return;

  try {
    const file = await handle.getFile();
    if (fileHandle === handle) send({ type: "wakfu-report-file", file });
  } catch (error) {
    send({ type: "wakfu-report-error" });
  }
});
