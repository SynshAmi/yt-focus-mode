console.log("LockIn running...");

let lockedVideo = null;
let focusActive = false;
let lastRedirect = 0;

function getVideoId(url) {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
}

function getCurrentTime() {
  const video = document.querySelector("video");
  return video ? Math.floor(video.currentTime) : 0;
}

function syncState() {
  chrome.storage.local.get(
    ["focusActive", "allowedVideo", "isPaused", "blockedCount"],
    (data) => {
      focusActive = data.focusActive || false;
      lockedVideo = data.allowedVideo || null;

      if (!focusActive && data.isPaused) {
        chrome.storage.local.set({ isPaused: false });
      }

      if (!focusActive) {
        chrome.storage.local.set({ blockedCount: 0 });
      }
    }
  );
}

function lockIfVideoOpen() {
  const current = getVideoId(window.location.href);

  if (current) {
    lockedVideo = current;
    chrome.storage.local.set({ allowedVideo: current });
  }
}

setInterval(() => {
  if (!focusActive || !lockedVideo) return;
  chrome.storage.local.set({ lastTime: getCurrentTime() });
}, 1000);

function redirectToLocked() {
  const now = Date.now();
  if (now - lastRedirect < 1500) return;
  lastRedirect = now;

  chrome.storage.local.get(["lastTime"], (data) => {
    const t = data.lastTime || 0;
    window.location.replace(
      `https://www.youtube.com/watch?v=${lockedVideo}&t=${t}s`
    );
  });
}

function incrementBlockedCount() {
  chrome.storage.local.get(["blockedCount"], (data) => {
    chrome.storage.local.set({
      blockedCount: (data.blockedCount || 0) + 1
    });
  });
}

function shouldBlock(url) {
  if (!focusActive) return false;

  const targetVid = getVideoId(url);

  chrome.storage.local.get(["isPaused"], (pauseData) => {
    const paused = pauseData.isPaused || false;

    if (paused) {
      if (url.includes("/shorts")) {
        incrementBlockedCount();
        alert("Focus Mode: Shorts blocked.");
        redirectToLocked();
        return;
      }

      if (targetVid) {
        lockedVideo = targetVid;

        chrome.storage.local.set({
          allowedVideo: targetVid,
          isPaused: false,
          lastTime: 0
        });

        return;
      }

      return;
    }

    if (!lockedVideo) {
      if (targetVid) {
        lockedVideo = targetVid;
        chrome.storage.local.set({ allowedVideo: targetVid });
      }
      return;
    }

    if (targetVid && targetVid !== lockedVideo) {
      incrementBlockedCount();
      alert("Focus Mode: Other videos blocked.");
      redirectToLocked();
      return;
    }

    if (
      url.includes("/shorts") ||
      url.includes("/feed") ||
      url.includes("/results") ||
      url.includes("/channel") ||
      url.includes("/playlist") ||
      url.includes("/@")
    ) {
      incrementBlockedCount();
      alert("Focus Mode: Distraction blocked.");
      redirectToLocked();
      return;
    }
  });

  return false;
}

function enforcePage() {
  if (!focusActive || !lockedVideo) return;

  const currentVid = getVideoId(window.location.href);
  const path = window.location.pathname;

  if (currentVid && currentVid !== lockedVideo) {
    redirectToLocked();
    return;
  }

  if (
    path === "/" ||
    path.startsWith("/shorts") ||
    path.startsWith("/results") ||
    path.startsWith("/channel") ||
    path.startsWith("/@") ||
    path.startsWith("/feed") ||
    path.startsWith("/playlist")
  ) {
    redirectToLocked();
  }
}

(function patchHistory() {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (state, title, url) {
    if (url && shouldBlock(url)) return;
    return originalPush.apply(this, arguments);
  };

  history.replaceState = function (state, title, url) {
    if (url && shouldBlock(url)) return;
    return originalReplace.apply(this, arguments);
  };
})();

document.addEventListener(
  "click",
  (e) => {
    const link = e.target.closest("a");
    if (!link || !link.href) return;

    if (shouldBlock(link.href)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  },
  true
);

chrome.storage.onChanged.addListener(syncState);

window.addEventListener("load", () => {
  syncState();

  setTimeout(() => {
    chrome.storage.local.get(["focusActive"], (data) => {
      if (data.focusActive) lockIfVideoOpen();
    });
  }, 500);
});

setInterval(enforcePage, 300);