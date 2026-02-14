// ─── DOM elements ────────────────────────────────────────────────────────────

const disconnectedEl = document.getElementById("disconnected");
const connectedEl = document.getElementById("connected");
const urlInput = document.getElementById("voltic-url");
const tokenInput = document.getElementById("api-token");
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const workspaceNameEl = document.getElementById("workspace-name");
const errorMsg = document.getElementById("error-msg");

// ─── Init ────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(["volticUrl", "volticToken", "workspaceName"], (data) => {
  if (data.volticUrl && data.volticToken && data.workspaceName) {
    showConnected(data.workspaceName);
  } else {
    showDisconnected();
    if (data.volticUrl) urlInput.value = data.volticUrl;
  }
});

// ─── Connect ─────────────────────────────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim().replace(/\/+$/, "");
  const token = tokenInput.value.trim();

  if (!url || !token) {
    showError("Please enter both the URL and token.");
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";
  hideError();

  try {
    const res = await fetch(`${url}/api/extension/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const name = data.workspace?.name ?? "Workspace";

    chrome.storage.sync.set({
      volticUrl: url,
      volticToken: token,
      workspaceName: name,
      workspaceId: data.workspace?.id,
    });

    showConnected(name);
  } catch (err) {
    showError(err.message || "Connection failed");
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect";
  }
});

// ─── Disconnect ──────────────────────────────────────────────────────────────

disconnectBtn.addEventListener("click", () => {
  chrome.storage.sync.remove(
    ["volticUrl", "volticToken", "workspaceName", "workspaceId"],
    () => {
      showDisconnected();
    }
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showConnected(name) {
  disconnectedEl.classList.add("hidden");
  connectedEl.classList.remove("hidden");
  workspaceNameEl.textContent = name;
}

function showDisconnected() {
  connectedEl.classList.add("hidden");
  disconnectedEl.classList.remove("hidden");
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}
