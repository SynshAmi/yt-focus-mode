document.addEventListener("DOMContentLoaded", () => {
  const start = document.getElementById("start");
  const stop = document.getElementById("stop");

  start.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);

      const videoId = url.searchParams.get("v");

      if (videoId) {
        chrome.storage.local.set({
          focusActive: true,
          allowedVideo: videoId
        });

        alert("Focus Mode ON! Locked this video.");
      } else {
        chrome.storage.local.set({
          focusActive: true,
          allowedVideo: null
        });

        alert("Focus Mode ON! Open a video to lock.");
      }
    });
  });

  stop.addEventListener("click", () => {
    chrome.storage.local.set({
      focusActive: false,
      allowedVideo: null
    });

    alert("Focus Mode OFF. YouTube is normal again.");
  });
});
