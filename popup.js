document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const dot = document.getElementById("dot");
  const statusBox = document.getElementById("statusBox");
  const blockedCountEl = document.getElementById("blockedCount");
  const pauseBtn = document.getElementById("pauseBtn");

  function renderUI(data) {
    const active = data.focusActive || false;
    const video = data.allowedVideo || null;
    const blocked = data.blockedCount || 0;
    const paused = data.isPaused || false;

    blockedCountEl.textContent = blocked;

    if (!active) {
      toggle.classList.remove("active");
      dot.style.background = "#737373";
      statusBox.textContent = "Focus mode is off.";
      pauseBtn.style.display = "none";
      return;
    }

    toggle.classList.add("active");
    dot.style.background = "#ef4444";
    pauseBtn.style.display = "block";

    if (paused) {
      statusBox.innerHTML = `
        <b style="color:white;">Session Paused</b><br>
        <span style="font-size:11px;color:#a3a3a3;">
          Open a new video to lock.
        </span>
      `;
      pauseBtn.textContent = "Cancel Pause";
      return;
    }

    if (video) {
      statusBox.innerHTML = `
        <p style="margin:0;font-size:11px;color:#737373;">Locked Video:</p>
        <a href="https://youtube.com/watch?v=${video}" target="_blank">
          ${video}
        </a>
      `;
      pauseBtn.textContent = "Pause Session";
    } else {
      statusBox.textContent = "Open a video to lock.";
      pauseBtn.textContent = "Pause Session";
    }
  }

  chrome.storage.local.get(
    ["focusActive", "allowedVideo", "blockedCount", "isPaused"],
    renderUI
  );

  toggle.addEventListener("click", () => {
  chrome.storage.local.get(["focusActive"], (data) => {
    const newState = !data.focusActive;

    if (!newState) {
      chrome.storage.local.set({
        focusActive: false,
        allowedVideo: null,
        isPaused: false,
        blockedCount: 0
      });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      let videoId = null;

      try {
        const url = new URL(tab.url);
        videoId = url.searchParams.get("v");
      } catch {}

      chrome.storage.local.set({
        focusActive: true,
        allowedVideo: videoId || null,
        isPaused: false,
        blockedCount: 0
      });
    });
  });
});


pauseBtn.addEventListener("click", () => {
  chrome.storage.local.get(
    ["isPaused", "allowedVideo"],
    (data) => {
      const paused = data.isPaused || false;
      const currentLocked = data.allowedVideo || null;

      if (!paused) {
        chrome.storage.local.set({
          isPaused: true,
          prevLocked: currentLocked
        });
      } else {
        chrome.storage.local.get(["prevLocked"], (prev) => {
          chrome.storage.local.set({
            isPaused: false,
            allowedVideo: prev.prevLocked || currentLocked || null,
            prevLocked: null
          });
        });
      }
    }
  );
});



  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(
      ["focusActive", "allowedVideo", "blockedCount", "isPaused"],
      renderUI
    );
  });
});