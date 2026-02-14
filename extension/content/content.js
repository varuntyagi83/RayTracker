// ─── Voltic Content Script — Meta Ad Library ────────────────────────────────
// Injects: connection banner, per-ad "Save to Voltic" buttons, board selector

(function () {
  "use strict";

  let AUTH = null; // { volticUrl, volticToken, workspaceName }
  let BOARDS_CACHE = null;
  let BOARDS_CACHE_TIME = 0;
  const BOARDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ─── Init ──────────────────────────────────────────────────────────────────

  chrome.storage.sync.get(
    ["volticUrl", "volticToken", "workspaceName"],
    (data) => {
      if (data.volticUrl && data.volticToken) {
        AUTH = {
          volticUrl: data.volticUrl,
          volticToken: data.volticToken,
          workspaceName: data.workspaceName || "Workspace",
        };
      }
      injectBanner();
      if (AUTH) {
        scanAndInjectButtons();
        observeDOM();
      }
    }
  );

  // Listen for auth changes (popup connect/disconnect)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.volticToken || changes.volticUrl) {
      chrome.storage.sync.get(
        ["volticUrl", "volticToken", "workspaceName"],
        (data) => {
          if (data.volticUrl && data.volticToken) {
            AUTH = {
              volticUrl: data.volticUrl,
              volticToken: data.volticToken,
              workspaceName: data.workspaceName || "Workspace",
            };
          } else {
            AUTH = null;
          }
          // Remove existing banner and buttons, re-inject
          document.querySelector(".voltic-banner")?.remove();
          document
            .querySelectorAll(".voltic-save-btn")
            .forEach((el) => el.remove());
          injectBanner();
          if (AUTH) {
            scanAndInjectButtons();
          }
        }
      );
    }
  });

  // ─── Banner ────────────────────────────────────────────────────────────────

  function injectBanner() {
    if (document.querySelector(".voltic-banner")) return;

    const banner = document.createElement("div");
    banner.className = AUTH
      ? "voltic-banner voltic-banner--connected"
      : "voltic-banner voltic-banner--disconnected";

    const dot = document.createElement("span");
    dot.className = "voltic-banner__dot";

    const text = document.createElement("span");
    text.textContent = AUTH
      ? `Connected to ${AUTH.workspaceName}`
      : "Voltic: Not connected — open the extension popup to connect";

    const close = document.createElement("button");
    close.className = "voltic-banner__close";
    close.textContent = "\u00d7";
    close.addEventListener("click", () => banner.remove());

    banner.append(dot, text, close);
    document.body.prepend(banner);
  }

  // ─── Ad Card Detection ─────────────────────────────────────────────────────

  // Meta's class names change frequently. Try multiple selectors.
  const AD_CARD_SELECTORS = [
    '[class*="xrvj5dj"]',
    '[role="article"]',
    '[data-testid="ad_library_card"]',
    "._99s5", // Legacy fallback
  ];

  function findAdCards() {
    for (const selector of AD_CARD_SELECTORS) {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) return Array.from(cards);
    }
    return [];
  }

  // ─── Ad Data Parser ────────────────────────────────────────────────────────

  function parseAdCard(card) {
    const data = {
      metaLibraryId: null,
      brandName: null,
      headline: null,
      body: null,
      format: "image",
      imageUrl: null,
      landingPageUrl: null,
      platforms: null,
      startDate: null,
      runtimeDays: null,
    };

    // Meta library ID from links containing "id="
    const links = card.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const idMatch = href.match(/[?&]id=(\d+)/);
      if (idMatch) {
        data.metaLibraryId = idMatch[1];
        break;
      }
    }

    // Brand name — first strong/heading-like element
    const headingEl =
      card.querySelector("h3") ||
      card.querySelector("h4") ||
      card.querySelector('[class*="x1heor9g"]') ||
      card.querySelector("strong");
    if (headingEl) {
      data.brandName = headingEl.textContent.trim();
    }

    // Headline + body — look for text blocks
    const textBlocks = card.querySelectorAll(
      'div[class*="xdj266r"], div[class*="x11i5rnm"], span[class*="x1lliihq"]'
    );
    const texts = [];
    textBlocks.forEach((el) => {
      const t = el.textContent.trim();
      if (t && t.length > 5) texts.push(t);
    });
    if (texts.length > 0) data.headline = texts[0].slice(0, 200);
    if (texts.length > 1) data.body = texts[1].slice(0, 500);

    // Image URL
    const img = card.querySelector("img[src]");
    if (img) {
      data.imageUrl = img.getAttribute("src");
    }

    // Video detection
    const video = card.querySelector("video");
    if (video) {
      data.format = "video";
    }

    // Landing page URL — CTA links (external href)
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (
        href.startsWith("http") &&
        !href.includes("facebook.com") &&
        !href.includes("fb.com")
      ) {
        data.landingPageUrl = href;
        break;
      }
    }

    // Platforms — look for platform text
    const platformText = card.textContent || "";
    const platforms = [];
    if (/facebook/i.test(platformText)) platforms.push("facebook");
    if (/instagram/i.test(platformText)) platforms.push("instagram");
    if (/messenger/i.test(platformText)) platforms.push("messenger");
    if (/audience network/i.test(platformText))
      platforms.push("audience_network");
    if (platforms.length > 0) data.platforms = platforms;

    // Start date — look for date patterns
    const dateMatch = platformText.match(
      /Started running on\s+([\w\s,]+\d{4})/i
    );
    if (dateMatch) {
      try {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          data.startDate = parsed.toISOString().split("T")[0];
          data.runtimeDays = Math.max(
            1,
            Math.ceil((Date.now() - parsed.getTime()) / 86400000)
          );
        }
      } catch {
        // Ignore parse failures
      }
    }

    return data;
  }

  // ─── Button Injection ──────────────────────────────────────────────────────

  function scanAndInjectButtons() {
    if (!AUTH) return;

    const cards = findAdCards();
    for (const card of cards) {
      if (card.querySelector(".voltic-save-btn")) continue;

      const btn = document.createElement("button");
      btn.className = "voltic-save-btn";
      btn.innerHTML =
        '<svg class="voltic-save-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' +
        "Save to Voltic";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        showBoardDropdown(btn, card);
      });

      // Append to the card
      card.style.position = card.style.position || "relative";
      card.appendChild(btn);
    }
  }

  // ─── Board Dropdown ────────────────────────────────────────────────────────

  async function fetchBoards() {
    if (
      BOARDS_CACHE &&
      Date.now() - BOARDS_CACHE_TIME < BOARDS_CACHE_TTL
    ) {
      return BOARDS_CACHE;
    }

    const res = await fetch(`${AUTH.volticUrl}/api/extension/boards`, {
      headers: { Authorization: `Bearer ${AUTH.volticToken}` },
    });

    if (!res.ok) throw new Error("Failed to fetch boards");

    const data = await res.json();
    BOARDS_CACHE = data.boards || [];
    BOARDS_CACHE_TIME = Date.now();
    return BOARDS_CACHE;
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".voltic-dropdown").forEach((el) => el.remove());
  }

  async function showBoardDropdown(btn, card) {
    // Close any existing dropdown
    closeAllDropdowns();

    const dropdown = document.createElement("div");
    dropdown.className = "voltic-dropdown";

    const loading = document.createElement("div");
    loading.className = "voltic-dropdown__loading";
    loading.textContent = "Loading boards...";
    dropdown.appendChild(loading);

    btn.style.position = "relative";
    btn.appendChild(dropdown);

    // Close on outside click
    const onClickOutside = (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.remove();
        document.removeEventListener("click", onClickOutside, true);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", onClickOutside, true);
    }, 0);

    try {
      const boards = await fetchBoards();
      dropdown.innerHTML = "";

      if (boards.length === 0) {
        const empty = document.createElement("div");
        empty.className = "voltic-dropdown__empty";
        empty.textContent = "No boards yet. Create one in Voltic.";
        dropdown.appendChild(empty);
        return;
      }

      for (const board of boards) {
        const item = document.createElement("button");
        item.className = "voltic-dropdown__item";
        item.textContent = board.name;
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          dropdown.remove();
          document.removeEventListener("click", onClickOutside, true);
          await saveAd(btn, card, board.id);
        });
        dropdown.appendChild(item);
      }
    } catch {
      dropdown.innerHTML = "";
      const err = document.createElement("div");
      err.className = "voltic-dropdown__empty";
      err.textContent = "Failed to load boards";
      dropdown.appendChild(err);
    }
  }

  // ─── Save Ad ───────────────────────────────────────────────────────────────

  async function saveAd(btn, card, boardId) {
    btn.disabled = true;
    btn.textContent = "Saving...";

    const adData = parseAdCard(card);

    try {
      const res = await fetch(`${AUTH.volticUrl}/api/extension/save-ad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH.volticToken}`,
        },
        body: JSON.stringify({ boardId, ad: adData }),
      });

      if (!res.ok) throw new Error("Save failed");

      const result = await res.json();

      btn.classList.add("voltic-save-btn--saved");
      btn.innerHTML =
        '<svg class="voltic-save-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        (result.duplicate ? "Already Saved" : "Saved \u2713");
    } catch {
      btn.disabled = false;
      btn.innerHTML =
        '<svg class="voltic-save-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' +
        "Save to Voltic";
    }
  }

  // ─── DOM Observer ──────────────────────────────────────────────────────────

  let scanTimeout = null;

  function observeDOM() {
    const observer = new MutationObserver(() => {
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        scanAndInjectButtons();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
})();
