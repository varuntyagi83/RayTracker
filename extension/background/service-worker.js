// Voltic Chrome Extension — Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[Voltic] Extension installed");
  } else if (details.reason === "update") {
    console.log("[Voltic] Extension updated to", chrome.runtime.getManifest().version);
  }
});
