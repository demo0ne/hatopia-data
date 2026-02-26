window.HatopiaAppVersion = "1.0.29";
(() => {
  const STORAGE_KEY = "hatopia_todos_v1";
  const SEA_ONLY_KEY = "hatopia_sea_only";
  const DISABLE_ASIA_KEY = "hatopia_disable_asia";
  const GROUP_ORDER_KEY = "hatopia_group_order";
  const DEFAULT_GROUP_ORDER = ["SEA", "ASIA", "TW"];
  const THEME_MODE_KEY = "hatopia_theme_mode";
  const LIGHT_VARIANT_KEY = "hatopia_light_variant";
  const DARK_VARIANT_KEY = "hatopia_dark_variant";
  const ADMIN_KEY = "hatopia_admin";
  const DISCORD_WEBHOOK_STORAGE_KEY = "hatopia_discord_webhook";
  const SETUP_DONE_KEY = "hatopia_setup_done";
  const SETUP_RESET_DAILY_KEY = "hatopia_reset_daily";
  const SETUP_RESET_WEEKLY_KEY = "hatopia_reset_weekly";
  const LAST_DAILY_RESET_KEY = "hatopia_last_daily_reset";
  const LAST_WEEKLY_RESET_KEY = "hatopia_last_weekly_reset";
  const DONT_ASK_RESET_MODAL_GAME_DAY_KEY = "hatopia_dont_ask_reset_modal_game_day";
  function getResolvedMode() {
    const mode = localStorage.getItem(THEME_MODE_KEY) || "system";
    if (mode === "light" || mode === "dark") return mode;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function migrateThemeStorage() {
    const oldTheme = localStorage.getItem("hatopia_theme");
    const oldPink = localStorage.getItem("hatopia_pink_dark_mode") === "1";
    const oldBlue = localStorage.getItem("hatopia_blue_light_mode") === "1";
    if (oldTheme && !localStorage.getItem(THEME_MODE_KEY)) {
      localStorage.setItem(THEME_MODE_KEY, oldTheme === "dark" || oldTheme === "light" ? oldTheme : "light");
      if (!localStorage.getItem(LIGHT_VARIANT_KEY)) {
        localStorage.setItem(LIGHT_VARIANT_KEY, oldBlue ? "blue" : "default");
      }
      if (!localStorage.getItem(DARK_VARIANT_KEY)) {
        localStorage.setItem(DARK_VARIANT_KEY, oldPink ? "pink" : "blue");
      }
    }
  }

  function applyTheme() {
    migrateThemeStorage();
    const mode = getResolvedMode();
    const lightVariant = localStorage.getItem(LIGHT_VARIANT_KEY) || "default";
    const darkVariant = localStorage.getItem(DARK_VARIANT_KEY) || "default";
    const variant = mode === "light" ? lightVariant : darkVariant;
    const dataTheme = mode === "light"
      ? (variant === "pink" ? "light-pink" : variant === "blue" ? "light-blue" : "light-default")
      : (variant === "pink" ? "dark-pink" : variant === "blue" ? "dark-blue" : "dark-default");
    document.documentElement.setAttribute("data-theme", dataTheme);
  }

  function initThemeSystemPrefListener() {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (localStorage.getItem(THEME_MODE_KEY) === "system") applyTheme();
    });
  }

  /**
   * Get Discord webhook URL from localStorage, or prompt once and store. Returns null if user cancels.
   * @returns {string | null}
   */
  function getDiscordWebhookUrl() {
    let url = localStorage.getItem(DISCORD_WEBHOOK_STORAGE_KEY);
    if (url && url.trim()) return url.trim();
    const input = window.prompt(
      "Enter your Discord webhook URL (stored only in this browser, never sent to our servers):"
    );
    if (input == null || !input.trim()) return null;
    url = input.trim();
    localStorage.setItem(DISCORD_WEBHOOK_STORAGE_KEY, url);
    return url;
  }

  (function () {
    applyTheme();
    initThemeSystemPrefListener();
  })();
  const APP_SHELL_HTML = window.APP_SHELL_HTML;
  function buildShell() {
    const root = document.getElementById("root");
    if (!root) return;
    root.innerHTML = APP_SHELL_HTML;
  }
  buildShell();

    const GROUPS = [
    { id: "SEA", label: "SEA", flag: "🇵🇭" },
    { id: "ASIA", label: "ASIA", flag: "🇰🇷" },
    { id: "TW", label: "TW", flag: "🇹🇼" },
  ];

  const VALID_FREQUENCIES = ["daily", "weekly", "seasonal", "other"];
  /** Type sort order: Other, Seasonal, Weekly, Daily (lower index = higher in list) */
  const TYPE_SORT_ORDER = { other: 0, seasonal: 1, weekly: 2, daily: 3 };

  function compareTasksByImportanceAndType(a, b) {
    const aImportant = !!a.important;
    const bImportant = !!b.important;
    if (aImportant !== bImportant) return aImportant ? -1 : 1;
    const aOrder = TYPE_SORT_ORDER[a.frequency || "daily"] ?? 3;
    const bOrder = TYPE_SORT_ORDER[b.frequency || "daily"] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.createdAt - a.createdAt;
  }

  /** Sort by explicit order first (user drag), then importance/type. */
  function compareTasksWithOrder(a, b) {
    const aOrd = typeof a.order === "number" ? a.order : 1e9;
    const bOrd = typeof b.order === "number" ? b.order : 1e9;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return compareTasksByImportanceAndType(a, b);
  }

  /**
   * @typedef {{ id: string; text: string; completed: boolean }} SubTask
   * @typedef {{ id: string; text: string; completed: boolean; createdAt: number; group: string; frequency: "daily" | "weekly" | "seasonal" | "other"; important?: boolean; order?: number; subtasks: SubTask[] }} Todo
   */

  /** @type {HTMLFormElement | null} */
  const form = document.getElementById("todo-form");
  /** @type {HTMLInputElement | null} */
  const input = document.getElementById("todo-input");
  /** @type {HTMLInputElement | null} */
  const subtaskDraftInput = document.getElementById("new-subtask-input");
  /** @type {HTMLButtonElement | null} */
  const subtaskDraftAddBtn = document.getElementById("add-subtask-draft");
  /** @type {HTMLUListElement | null} */
  const subtaskDraftList = document.getElementById("subtask-draft-list");
  /** @type {HTMLSelectElement | null} */
  const typeSelect = document.getElementById("todo-type");
  /** @type {HTMLInputElement | null} */
  const importantCheckbox = document.getElementById("todo-important");
  /** @type {HTMLSelectElement | null} */
  const groupSelect = document.getElementById("todo-group");
  /** @type {HTMLUListElement | null} */
  const seaList = document.getElementById("todo-list-SEA");
  /** @type {HTMLUListElement | null} */
  const asiaList = document.getElementById("todo-list-ASIA");
  /** @type {HTMLUListElement | null} */
  const twList = document.getElementById("todo-list-TW");
  /** @type {HTMLUListElement | null} */
  const seaListCompleted = document.getElementById("todo-list-SEA-completed");
  /** @type {HTMLUListElement | null} */
  const asiaListCompleted = document.getElementById("todo-list-ASIA-completed");
  /** @type {HTMLUListElement | null} */
  const twListCompleted = document.getElementById("todo-list-TW-completed");
  /** @type {HTMLElement | null} */
  const emptyState = document.getElementById("empty-state");
  /** @type {HTMLElement | null} */
  const countEl = document.getElementById("todo-count");
  const countAsiaEl = document.getElementById("todo-count-asia");
  const countTwEl = document.getElementById("todo-count-tw");
  /** @type {HTMLSelectElement | null} */

  /** @type {Todo[]} */
  let todos = [];
  /** @type {SubTask[]} */
  let draftSubtasks = [];

  /** @type {boolean} */
  let seaOnlyMode = true;
  /** @type {boolean} - when true, hide ASIA everywhere and skip ASIA when adding to "all groups". When false, SEA_ONLY still hides ASIA if set. */
  let disableAsiaMode = false;

  const DATA_BASE = "https://raw.githubusercontent.com/demo0ne/hatopia-data/master/";
  const SEA_ICON_URL = DATA_BASE + "images/groups/SEA.png";
  const HEARTOPIA_ICON_URL = DATA_BASE + "images/hatopia.png";

  function getGroupOrder() {
    try {
      const raw = window.localStorage.getItem(GROUP_ORDER_KEY);
      if (!raw) return DEFAULT_GROUP_ORDER.slice();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_GROUP_ORDER.slice();
      const valid = parsed.filter((id) => DEFAULT_GROUP_ORDER.includes(id));
      if (valid.length !== 3) return DEFAULT_GROUP_ORDER.slice();
      return parsed;
    } catch (_) {
      return DEFAULT_GROUP_ORDER.slice();
    }
  }

  function saveGroupOrder(order) {
    try {
      window.localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(order));
    } catch (_) {}
  }

  function applyGroupOrder() {
    const main = document.querySelector(".app-main");
    const scrollContainer = main?.querySelector(".main-content-scroll");
    if (!scrollContainer) return;
    const order = getGroupOrder();
    order.forEach((groupId) => {
      const section = document.getElementById("group-" + groupId);
      if (section) scrollContainer.appendChild(section);
    });
  }

  /** Returns group ids that are visible and included in "all groups" (SEA always; ASIA only when not disabled and not SEA-only; TW when not SEA-only). */
  function getActiveGroupIds() {
    const ids = ["SEA"];
    if (!seaOnlyMode) {
      if (!disableAsiaMode) ids.push("ASIA");
      ids.push("TW");
    }
    return ids;
  }

  function applySeaOnlyMode() {
    const on = seaOnlyMode;
    document.getElementById("focus-group-wrapper")?.classList.toggle("sea-only-hide", on);
    document.getElementById("form-group-field")?.classList.toggle("sea-only-hide", on);
    document.getElementById("group-ASIA")?.classList.toggle("sea-only-hide", on || disableAsiaMode);
    document.getElementById("group-TW")?.classList.toggle("sea-only-hide", on);
    document.querySelectorAll(".group-option-asia").forEach((el) => el.classList.toggle("asia-disabled-hide", disableAsiaMode));
    const seaTitle = document.getElementById("sea-group-title");
    if (seaTitle) seaTitle.textContent = on ? "Heartopia To-dos" : "SEA";
    const seaIcon = document.getElementById("sea-group-icon");
    if (seaIcon) {
      seaIcon.src = on ? HEARTOPIA_ICON_URL : SEA_ICON_URL;
      seaIcon.alt = on ? "Heartopia" : "Philippines flag for SEA group";
    }
  }

  function loadFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validGroupIds = GROUPS.map((g) => g.id);
        todos = parsed
          .filter(
            (t) =>
              typeof t === "object" &&
              typeof t.id === "string" &&
              typeof t.text === "string" &&
              typeof t.completed === "boolean"
          )
          .map((t) => {
            const rawSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
            const subtasks = rawSubtasks
              .filter(
                (s) =>
                  s &&
                  typeof s.id === "string" &&
                  typeof s.text === "string" &&
                  typeof s.completed === "boolean"
              )
              .map((s) => ({
                id: s.id,
                text: s.text,
                completed: s.completed,
              }));
            return {
              ...t,
              group: validGroupIds.includes(t.group) ? t.group : "SEA",
              frequency: VALID_FREQUENCIES.includes(t.frequency) ? t.frequency : "daily",
              subtasks,
            };
          });
      }
    } catch (err) {
      console.warn("Failed to read todos from localStorage", err);
    }
  }

  function saveToStorage() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (err) {
      console.warn("Failed to save todos to localStorage", err);
    }
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /**
   * @param {SubmitEvent} event
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    const selectedValue = seaOnlyMode ? "SEA" : (groupSelect ? groupSelect.value : "SEA");

    const frequency =
      typeSelect && VALID_FREQUENCIES.includes(typeSelect.value)
        ? typeSelect.value
        : "daily";
    const important = !!(importantCheckbox && importantCheckbox.checked);

    const targetGroupIds =
      seaOnlyMode
        ? ["SEA"]
        : selectedValue === "ALL"
        ? getActiveGroupIds()
        : GROUPS.some((g) => g.id === selectedValue)
        ? [selectedValue]
        : ["SEA"];

    const now = Date.now();

    const newTodos = targetGroupIds.map((groupId, index) => ({
      id: createId(),
      text,
      completed: false,
      createdAt: now + index,
      groupId,
      group: groupId,
      frequency,
      important,
      subtasks: draftSubtasks.map((s) => ({
        id: s.id,
        text: s.text,
        completed: false,
      })),
    }));

    todos = [...newTodos, ...todos];
    input.value = "";
    draftSubtasks = [];
    renderDraftSubtasks();
    saveToStorage();
    renderTodos();
    document.getElementById("add-task-dialog")?.close();
    input.focus();
  }

  const COMPLETE_SOUND_URL =
    "https://raw.githubusercontent.com/demo0ne/hatopia-data/master/sound/complete.mp3";

  function playCompleteSound() {
    try {
      const audio = new Audio(COMPLETE_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  /**
   * @param {string} id
   */
  function toggleTodo(id) {
    const task = todos.find((t) => t.id === id);
    const wasIncomplete = task && !task.completed;
    todos = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    if (wasIncomplete) playCompleteSound();
    saveToStorage();
    renderTodos();
  }

  /**
   * @param {string} id
   * @param {string} text
   */
  function updateTodoText(id, text) {
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    todos = todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
    saveToStorage();
    renderTodos();
  }

  /**
   * @param {string} id
   */
  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveToStorage();
    renderTodos();
  }

  /**
   * Reset completed tasks to active. selectedTypes: array of "daily"|"weekly"|"seasonal"|"other", or "all".
   * @param {string[] | "all"} selectedTypes
   */
  function resetAllToActive(selectedTypes) {
    const hasCompleted = todos.some((t) => t.completed);
    if (!hasCompleted) return;
    const types = selectedTypes === "all" || (Array.isArray(selectedTypes) && selectedTypes.length >= 4)
      ? "all"
      : Array.isArray(selectedTypes)
        ? selectedTypes
        : ["daily"];
    todos = todos.map((t) => {
      if (!t.completed) return t;
      if (types !== "all" && !types.includes(t.frequency || "daily")) return t;
      return {
        ...t,
        completed: false,
        subtasks: (t.subtasks || []).map((s) => ({
          ...s,
          completed: false,
        })),
      };
    });
    saveToStorage();
    renderTodos();
  }

  const countByGroup = {
    SEA: countEl,
    ASIA: countAsiaEl,
    TW: countTwEl,
  };

  function updateCount() {
    GROUPS.forEach(({ id }) => {
      const el = countByGroup[id];
      if (!el) return;
      const groupTodos = todos.filter((t) => (t.group || "SEA") === id);
      const total = groupTodos.length;
      const remaining = groupTodos.filter((t) => !t.completed).length;
      let label = `${total} task${total === 1 ? "" : "s"}`;
      if (total > 0) {
        label += ` • ${remaining} left`;
      }
      el.textContent = label;
    });
  }

  function updateEmptyState() {
    if (!emptyState) return;
    emptyState.style.display = todos.length === 0 ? "block" : "none";
  }

  /**
   * @param {"all" | "SEA" | "ASIA" | "TW"} groupId
   */
  function doExport(groupId) {
    const toExport = groupId === "all" ? todos : todos.filter((t) => t.group === groupId);
    const data = JSON.stringify(toExport, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const suffix = groupId === "all" ? "" : "-" + groupId;
    a.download = "hatopia-tasks-" + new Date().toISOString().slice(0, 10) + suffix + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function sendToDiscord() {
    const includeRoamingFlawless = document.getElementById("uploads-include-in-message");
    const includeImagesCheck = document.getElementById("uploads-include-images-in-message");
    const includeRemarkCheck = document.getElementById("uploads-include-remark-in-message");
    const remarkInput = document.getElementById("uploads-remark");
    const flawlessSelect = document.getElementById("uploads-flawless-flouride");
    const roamingSelect = document.getElementById("uploads-roaming-oak");
    if (!flawlessSelect || !roamingSelect) return;

    const parts = [];
    if (includeRoamingFlawless && includeRoamingFlawless.checked) {
      parts.push("💎 Flawless Flouride : " + (flawlessSelect.value || "") + "\n" + "🌳 Roaming Oak: " + (roamingSelect.value || ""));
    }
    if (includeRemarkCheck && includeRemarkCheck.checked && remarkInput) {
      const remark = (remarkInput.value || "").trim();
      if (remark) parts.push(remark);
    }
    const message = parts.join("\n\n");

    const includeImages = includeImagesCheck && includeImagesCheck.checked;
    const imageBlobs = [];
    if (includeImages) {
      uploadedItems.forEach((item) => {
        const blob = item.file || item.blob;
        if (blob && blob.type && blob.type.startsWith("image/")) {
          imageBlobs.push(blob);
        }
      });
    }

    if (!message && imageBlobs.length === 0) {
      alert("No message to send. Check \"Include in Message\" for Roaming Oak/Flawless, add a Remark, or include images.");
      return;
    }

    const webhookUrl = getDiscordWebhookUrl();
    if (!webhookUrl) return;

    const btn = document.getElementById("send-discord");
    try {
      if (imageBlobs.length > 0) {
        const form = new FormData();
        form.append("payload_json", JSON.stringify({ content: message || null }));
        imageBlobs.forEach((blob, i) => {
          const ext = (blob.type === "image/png") ? "png" : (blob.type === "image/gif") ? "gif" : "jpg";
          form.append("files[" + i + "]", blob, "image-" + (i + 1) + "." + ext);
        });
        const res = await fetch(webhookUrl, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Webhook request failed");
      } else {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message || "" }),
        });
        if (!res.ok) throw new Error("Webhook request failed");
      }
      if (btn) {
        const origText = btn.textContent;
        btn.textContent = "✓ Sent";
        setTimeout(() => { btn.textContent = origText; }, 2000);
      }
    } catch (err) {
      console.warn("Discord send failed", err);
      if (btn) {
        const origText = btn.textContent;
        btn.textContent = "Failed";
        setTimeout(() => { btn.textContent = origText; }, 2000);
      }
    }
  }

  function exportTasks() {
    if (seaOnlyMode) {
      doExport("SEA");
      return;
    }
    const dialog = document.getElementById("export-dialog");
    const select = document.getElementById("export-group-select");
    if (!dialog || !select) return;
    select.value = "all";
    dialog.showModal();
  }

  /**
   * @param {unknown} raw
   * @returns {Todo[]}
   */
  function normalizeImportedTasks(raw) {
    const parsed = Array.isArray(raw) ? raw : [];
    const validGroupIds = GROUPS.map((g) => g.id);
    return parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.text === "string" &&
          typeof t.completed === "boolean"
      )
      .map((t) => {
        const rawSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        const subtasks = rawSubtasks
          .filter(
            (s) =>
              s &&
              typeof s.id === "string" &&
              typeof s.text === "string" &&
              typeof s.completed === "boolean"
          )
          .map((s) => ({ id: s.id, text: s.text, completed: s.completed }));
        return {
          ...t,
          group: validGroupIds.includes(t.group) ? t.group : "SEA",
          frequency: VALID_FREQUENCIES.includes(t.frequency) ? t.frequency : "daily",
          important: typeof t.important === "boolean" ? t.important : false,
          subtasks,
        };
      });
  }

  /**
   * @param {Todo[]} normalized
   * @param {"all" | "SEA" | "ASIA" | "TW"} targetGroup
   */
  function applyImport(normalized, targetGroup) {
    const willReplace = targetGroup === "all" ? todos.length > 0 : todos.some((t) => t.group === targetGroup);
    const message =
      targetGroup === "all"
        ? "This will replace your current tasks. Continue?"
        : `This will replace your ${targetGroup} tasks. Continue?`;
    if (willReplace && !window.confirm(message)) return;
    if (targetGroup === "all") {
      todos = normalized;
    } else {
      const withGroup = normalized.map((t) => ({ ...t, group: targetGroup }));
      todos = todos.filter((t) => t.group !== targetGroup).concat(withGroup);
    }
    saveToStorage();
    renderTodos();
  }

  function importTasks(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) {
          alert("Invalid file: expected a JSON array of tasks.");
          return;
        }
        const normalized = normalizeImportedTasks(parsed);
        if (seaOnlyMode) {
          applyImport(normalized, "SEA");
          return;
        }
        const dialog = document.getElementById("import-dialog");
        const select = document.getElementById("import-group-select");
        if (!dialog || !select) {
          applyImport(normalized, "all");
          return;
        }
        select.value = "all";
        dialog.showModal();
        document.getElementById("import-dialog-confirm")?.addEventListener(
          "click",
          () => {
            dialog.returnValue = "import";
            dialog.close();
          },
          { once: true }
        );
        document.getElementById("import-dialog-cancel")?.addEventListener("click", () => dialog.close(), { once: true });
        dialog.addEventListener(
          "close",
          () => {
            if (dialog.returnValue === "import") applyImport(normalized, select.value);
          },
          { once: true }
        );
      } catch (err) {
        alert("Invalid JSON file: " + (err.message || "parse error"));
      }
    };
    reader.readAsText(file);
  }

  /**
   * @param {Todo} todo
   */
  function createTodoElement(todo) {
    const li = document.createElement("li");
    const freq = todo.frequency || "daily";
    li.className = "todo-item todo-item--" + freq;
    li.dataset.id = todo.id;
    if (todo.completed) {
      li.classList.add("todo-item--completed");
    }

    const dragHandle = document.createElement("span");
    dragHandle.className = "todo-drag-handle";
    dragHandle.draggable = true;
    dragHandle.setAttribute("aria-label", "Drag to reorder");
    dragHandle.textContent = "⋮⋮";

    const check = document.createElement("button");
    check.type = "button";
    check.className = "todo-check";
    check.setAttribute("aria-label", "Toggle completed");

    const checkIcon = document.createElement("span");
    checkIcon.className = "todo-check-icon";
    check.appendChild(checkIcon);

    check.addEventListener("click", () => toggleTodo(todo.id));

    const textContainer = document.createElement("div");
    textContainer.className = "todo-text";
    textContainer.textContent = todo.text;

    const typeBadge = document.createElement("span");
    typeBadge.className =
      freq === "weekly"
        ? "todo-type-badge todo-type-badge--weekly"
        : freq === "seasonal"
        ? "todo-type-badge todo-type-badge--seasonal"
        : freq === "other"
        ? "todo-type-badge todo-type-badge--other"
        : "todo-type-badge";
    typeBadge.textContent =
      freq === "weekly" ? "Weekly" : freq === "seasonal" ? "Seasonal" : freq === "other" ? "Other" : "Daily";
    textContainer.appendChild(typeBadge);
    if (todo.important) {
      const importantBadge = document.createElement("span");
      importantBadge.className = "todo-type-badge todo-type-badge--important";
      importantBadge.textContent = "‼️Important";
      textContainer.appendChild(importantBadge);
    }

    const subtaskContainer = document.createElement("div");
    subtaskContainer.className = "subtask-container";

    const subtaskList = document.createElement("ul");
    subtaskList.className = "subtask-list";
    subtaskList.dataset.todoId = todo.id;

    (todo.subtasks || []).forEach((sub) => {
      const subLi = document.createElement("li");
      subLi.className = "subtask-item";
      subLi.dataset.todoId = todo.id;
      subLi.dataset.subtaskId = sub.id;
      if (sub.completed) {
        subLi.classList.add("subtask-item--completed");
      }

      const subDragHandle = document.createElement("span");
      subDragHandle.className = "subtask-drag-handle";
      subDragHandle.draggable = true;
      subDragHandle.setAttribute("aria-label", "Drag to reorder");
      subDragHandle.textContent = "⋮⋮";

      const subCheck = document.createElement("button");
      subCheck.type = "button";
      subCheck.className = "subtask-check";
      subCheck.setAttribute("aria-label", "Toggle sub-task completed");
      subCheck.addEventListener("click", () =>
        toggleSubtask(todo.id, sub.id)
      );

      const subCheckIcon = document.createElement("span");
      subCheckIcon.className = "subtask-check-icon";
      subCheck.appendChild(subCheckIcon);

      const subText = document.createElement("span");
      subText.className = "subtask-text";
      subText.textContent = sub.text;

      const subDelete = document.createElement("button");
      subDelete.type = "button";
      subDelete.className = "icon-button icon-button--danger subtask-delete";
      subDelete.textContent = "✕";
      subDelete.setAttribute("aria-label", "Delete sub-task");
      subDelete.addEventListener("click", () =>
        deleteSubtask(todo.id, sub.id)
      );

      subLi.appendChild(subDragHandle);
      subLi.appendChild(subCheck);
      subLi.appendChild(subText);
      subLi.appendChild(subDelete);
      subtaskList.appendChild(subLi);
    });

    let draggedSubtaskId = null;
    subtaskList.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".subtask-drag-handle");
      if (!handle) return;
      const row = handle.closest(".subtask-item");
      if (!row) return;
      e.dataTransfer.setData("text/plain", row.dataset.subtaskId || "");
      e.dataTransfer.effectAllowed = "move";
      draggedSubtaskId = row.dataset.subtaskId || null;
      row.classList.add("subtask-dragging");
    });
    subtaskList.addEventListener("dragend", (e) => {
      draggedSubtaskId = null;
      subtaskList.querySelectorAll(".subtask-item.subtask-dragging").forEach((el) =>
        el.classList.remove("subtask-dragging")
      );
    });
    subtaskList.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    });
    subtaskList.addEventListener("drop", (e) => {
      e.preventDefault();
      const subId = e.dataTransfer.getData("text/plain");
      if (!subId) return;
      const todoId = subtaskList.dataset.todoId;
      if (!todoId) return;
      const dropRow = e.target.closest(".subtask-item");
      if (!dropRow || dropRow.dataset.subtaskId === subId) return;
      const orderedIds = Array.from(subtaskList.querySelectorAll(".subtask-item")).map(
        (el) => el.dataset.subtaskId
      ).filter(Boolean);
      const insertIndex = orderedIds.indexOf(dropRow.dataset.subtaskId);
      if (insertIndex === -1) return;
      const without = orderedIds.filter((id) => id !== subId);
      const newOrder = without.slice(0, insertIndex).concat(subId, without.slice(insertIndex));
      reorderSubtasks(todoId, newOrder);
    });

    subtaskContainer.appendChild(subtaskList);
    textContainer.appendChild(subtaskContainer);

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const addSubtaskBtn = document.createElement("button");
    addSubtaskBtn.type = "button";
    addSubtaskBtn.className = "icon-button subtask-add-btn";
    addSubtaskBtn.textContent = "➕";
    addSubtaskBtn.setAttribute("aria-label", "Add sub-task");
    addSubtaskBtn.addEventListener("click", () =>
      enterAddSubtaskMode(li, todo, subtaskContainer, addSubtaskBtn)
    );

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-button";
    editBtn.innerHTML = "✏️";
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.addEventListener("click", () => enterEditMode(li, todo));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-button icon-button--danger";
    deleteBtn.innerHTML = "✕";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(addSubtaskBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(dragHandle);
    li.appendChild(check);
    li.appendChild(textContainer);
    li.appendChild(actions);

    return li;
  }

  /**
   * @param {HTMLLIElement} li
   * @param {Todo} todo
   */
  function enterEditMode(li, todo) {
    const textDiv = li.querySelector(".todo-text");
    const actions = li.querySelector(".todo-actions");
    if (!textDiv || !actions) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-text-input";
    input.value = todo.text;
    textDiv.replaceWith(input);
    input.focus();
    input.select();

    const prevActionsHTML = actions.innerHTML;

    actions.innerHTML = "";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "icon-button";
    saveBtn.textContent = "✔";
    saveBtn.setAttribute("aria-label", "Save changes");

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "icon-button";
    cancelBtn.textContent = "↩";
    cancelBtn.setAttribute("aria-label", "Cancel edit");

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    function exitEdit(save) {
      const value = input.value;
      if (save) {
        updateTodoText(todo.id, value);
      } else {
        renderTodos();
      }
    }

    saveBtn.addEventListener("click", () => exitEdit(true));
    cancelBtn.addEventListener("click", () => exitEdit(false));

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        exitEdit(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        exitEdit(false);
      }
    });
  }

  /**
   * Inline add sub-task: show input in task row instead of using prompt().
   * @param {HTMLLIElement} li
   * @param {Todo} todo
   * @param {HTMLElement} subtaskContainer
   * @param {HTMLButtonElement} addSubtaskBtn
   */
  function enterAddSubtaskMode(li, todo, subtaskContainer, addSubtaskBtn) {
    const existing = subtaskContainer.querySelector(".subtask-inline-add");
    if (existing) return;

    const row = document.createElement("div");
    row.className = "subtask-inline-add";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-text-input subtask-inline-input";
    input.placeholder = "Sub-task…";
    input.setAttribute("maxlength", "120");

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "icon-button";
    confirmBtn.textContent = "✔";
    confirmBtn.setAttribute("aria-label", "Add");

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "icon-button";
    cancelBtn.textContent = "✕";
    cancelBtn.setAttribute("aria-label", "Cancel");

    function finish(save) {
      const text = input.value.trim();
      if (save && text) addSubtask(todo.id, text);
      row.remove();
      addSubtaskBtn.style.display = "";
    }

    confirmBtn.addEventListener("click", () => finish(true));
    cancelBtn.addEventListener("click", () => finish(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });

    row.appendChild(input);
    row.appendChild(confirmBtn);
    row.appendChild(cancelBtn);
    subtaskContainer.appendChild(row);
    addSubtaskBtn.style.display = "none";
    input.focus();
  }

  function renderDraftSubtasks() {
    if (!subtaskDraftList) return;
    subtaskDraftList.innerHTML = "";

    draftSubtasks.forEach((sub) => {
      const li = document.createElement("li");
      li.className = "subtask-item";

      const textSpan = document.createElement("span");
      textSpan.className = "subtask-text";
      textSpan.textContent = sub.text;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "icon-button icon-button--danger subtask-delete";
      deleteBtn.textContent = "✕";
      deleteBtn.setAttribute("aria-label", "Remove sub-task from new task");
      deleteBtn.addEventListener("click", () => {
        draftSubtasks = draftSubtasks.filter((s) => s.id !== sub.id);
        renderDraftSubtasks();
      });

      li.appendChild(textSpan);
      li.appendChild(deleteBtn);
      subtaskDraftList.appendChild(li);
    });
  }

  /**
   * @param {string} todoId
   * @param {string} text
   */
  function addSubtask(todoId, text) {
    todos = todos.map((t) => {
      if (t.id !== todoId) return t;
      const newSub = {
        id: createId(),
        text,
        completed: false,
      };
      return {
        ...t,
        subtasks: [...(t.subtasks || []), newSub],
      };
    });
    saveToStorage();
    renderTodos();
  }

  /**
   * @param {string} todoId
   * @param {string} subId
   */
  function toggleSubtask(todoId, subId) {
    todos = todos.map((t) => {
      if (t.id !== todoId) return t;
      return {
        ...t,
        subtasks: (t.subtasks || []).map((s) =>
          s.id === subId ? { ...s, completed: !s.completed } : s
        ),
      };
    });
    saveToStorage();
    renderTodos();
  }

  /**
   * @param {string} todoId
   * @param {string} subId
   */
  function deleteSubtask(todoId, subId) {
    todos = todos.map((t) => {
      if (t.id !== todoId) return t;
      return {
        ...t,
        subtasks: (t.subtasks || []).filter((s) => s.id !== subId),
      };
    });
    saveToStorage();
    renderTodos();
  }

  /**
   * Reorder tasks within a group (pending or completed) by new order of todo ids.
   * @param {string} groupId
   * @param {boolean} completed
   * @param {string[]} orderedIds
   */
  function reorderTodosInGroup(groupId, completed, orderedIds) {
    if (!orderedIds.length) return;
    const inGroup = (t) => (t.group || "SEA") === groupId && !!t.completed === completed;
    const byId = new Map(todos.filter(inGroup).map((t) => [t.id, t]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    if (reordered.length !== orderedIds.length) return;
    const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
    todos = todos.map((t) => {
      if (!inGroup(t)) return t;
      const ord = orderMap.get(t.id);
      return ord === undefined ? t : { ...t, order: ord };
    });
    saveToStorage();
    renderTodos();
  }

  /**
   * Reorder sub-tasks for a todo by new order of sub-task ids.
   * @param {string} todoId
   * @param {string[]} orderedSubIds
   */
  function reorderSubtasks(todoId, orderedSubIds) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo || !Array.isArray(todo.subtasks) || orderedSubIds.length === 0) return;
    const byId = new Map((todo.subtasks || []).map((s) => [s.id, s]));
    const reordered = orderedSubIds.map((id) => byId.get(id)).filter(Boolean);
    if (reordered.length !== (todo.subtasks || []).length) return;
    todos = todos.map((t) => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: reordered };
    });
    saveToStorage();
    renderTodos();
  }

  function renderTodos() {
    if (!seaList || !asiaList || !twList) return;
    if (!seaListCompleted || !asiaListCompleted || !twListCompleted) return;

    seaList.innerHTML = "";
    asiaList.innerHTML = "";
    twList.innerHTML = "";
    seaListCompleted.innerHTML = "";
    asiaListCompleted.innerHTML = "";
    twListCompleted.innerHTML = "";

    const activeByGroup = { SEA: seaList, ASIA: asiaList, TW: twList };
    const completedByGroup = {
      SEA: seaListCompleted,
      ASIA: asiaListCompleted,
      TW: twListCompleted,
    };

    const incomplete = todos.filter((t) => !t.completed);
    const completed = todos.filter((t) => t.completed);

    incomplete
      .slice()
      .sort(compareTasksWithOrder)
      .forEach((todo) => {
        const groupId = todo.group || "SEA";
        const target = activeByGroup[groupId] || activeByGroup["SEA"];
        target.appendChild(createTodoElement(todo));
      });

    completed
      .slice()
      .sort(compareTasksWithOrder)
      .forEach((todo) => {
        const groupId = todo.group || "SEA";
        const target = completedByGroup[groupId] || completedByGroup["SEA"];
        target.appendChild(createTodoElement(todo));
      });

    GROUPS.forEach(({ id }) => {
      const pendingCount = incomplete.filter((t) => (t.group || "SEA") === id).length;
      const completedCount = completed.filter((t) => (t.group || "SEA") === id).length;

      const pendingWrapper = document.getElementById(`pending-wrapper-${id}`);
      if (pendingWrapper) {
        const countEl = pendingWrapper.querySelector(".pending-count");
        const chevron = pendingWrapper.querySelector(".pending-chevron");
        if (countEl) countEl.textContent = String(pendingCount);
        if (chevron) chevron.textContent = pendingWrapper.classList.contains("is-expanded") ? "▲" : "▼";
      }

      const completedWrapper = document.getElementById(`completed-wrapper-${id}`);
      if (completedWrapper) {
        const countEl = completedWrapper.querySelector(".completed-count");
        const chevron = completedWrapper.querySelector(".completed-chevron");
        if (countEl) countEl.textContent = String(completedCount);
        if (chevron) chevron.textContent = completedWrapper.classList.contains("is-expanded") ? "▲" : "▼";
      }
    });

    updateCount();
    updateEmptyState();
  }

  const GUIDES_IMAGES_BASE = DATA_BASE + "images/guides/";
  const GUIDES_ORDER_KEY = "hatopia_guides_order";
  const GUIDES_COLLAPSED_KEY = "hatopia_guides_collapsed";
  const GUIDES_EXPANDED_KEY = "hatopia_guides_expanded";
  let guidesPanelLoaded = false;

  function titleFromFilename(filename) {
    const base = (filename || "").replace(/\.[^.]+$/, "");
    return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getGuideItemTitle(item) {
    if (item.title != null && String(item.title).trim() !== "") return String(item.title).trim();
    if (item.image) return titleFromFilename(item.image);
    return "";
  }

  function openGuideLightbox(item, groupId) {
    const lb = document.getElementById("guide-lightbox");
    const imgEl = lb?.querySelector(".guide-lightbox-img");
    const titleEl = lb?.querySelector(".guide-lightbox-title");
    const detailsEl = lb?.querySelector(".guide-lightbox-details");
    const linkEl = lb?.querySelector(".guide-lightbox-link");
    const textWrap = lb?.querySelector(".guide-lightbox-text");
    if (!lb || !imgEl || !titleEl || !detailsEl || !linkEl) return;
    const hasImage = !!(item.image && String(item.image).trim());
    const hasText = !!(item.text != null && String(item.text).trim() !== "");
    const hasLink = !!(item.url && String(item.url).trim());
    const titleStr = getGuideItemTitle(item);

    titleEl.textContent = titleStr;
    titleEl.hidden = !titleStr;

    if (hasImage) {
      imgEl.src = (item.image.startsWith("http://") || item.image.startsWith("https://")) ? item.image
        : (groupId != null && groupId !== "") ? (GUIDES_IMAGES_BASE + groupId + "/" + item.image) : item.image;
      imgEl.alt = titleStr;
      imgEl.classList.remove("guide-lightbox-img--zoomed");
      imgEl.hidden = false;
    } else {
      imgEl.removeAttribute("src");
      imgEl.hidden = true;
    }

    detailsEl.innerHTML = "";
    textWrap.style.display = "";
    if (hasText) {
      const lines = String(item.text).split(/\n/);
      lines.forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        li.className = "guide-lightbox-text-line";
        detailsEl.appendChild(li);
      });
    }
    if (hasLink) {
      linkEl.href = item.url;
      linkEl.textContent = "Click Me 🌐";
      linkEl.hidden = false;
    } else {
      linkEl.href = "#";
      linkEl.hidden = true;
    }

    lb.classList.remove("guide-lightbox-has-image", "guide-lightbox-has-text", "guide-lightbox-half");
    if (hasImage) lb.classList.add("guide-lightbox-has-image");
    if (hasText) lb.classList.add("guide-lightbox-has-text");
    if (hasImage && (hasText || hasLink)) lb.classList.add("guide-lightbox-half");
    lb.hidden = false;
  }

  function initGuideLightbox() {
    const lightbox = document.getElementById("guide-lightbox");
    const closeBtn = lightbox?.querySelector(".guide-lightbox-close");
    const backdrop = lightbox?.querySelector(".guide-lightbox-backdrop");
    const imgEl = lightbox?.querySelector(".guide-lightbox-img");
    if (closeBtn) closeBtn.addEventListener("click", closeGuideLightbox);
    if (backdrop) backdrop.addEventListener("click", closeGuideLightbox);
    if (imgEl) {
      imgEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!imgEl.hidden) imgEl.classList.toggle("guide-lightbox-img--zoomed");
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGuideLightbox();
    });
  }

  function closeGuideLightbox() {
    const lb = document.getElementById("guide-lightbox");
    const imgEl = lb?.querySelector(".guide-lightbox-img");
    if (imgEl) imgEl.classList.remove("guide-lightbox-img--zoomed");
    if (lb) lb.hidden = true;
  }

  function getGuidesOrder(defaultOrder) {
    const fallback = Array.isArray(defaultOrder) && defaultOrder.length ? defaultOrder.slice() : [];
    try {
      const raw = localStorage.getItem(GUIDES_ORDER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          const known = new Set(fallback);
          const merged = arr.map((id) => (id === "links" ? "misc" : id)).filter((id) => known.has(id));
          fallback.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
          return merged;
        }
      }
    } catch (_) {}
    return fallback;
  }

  function saveGuidesOrder(order) {
    try {
      localStorage.setItem(GUIDES_ORDER_KEY, JSON.stringify(order));
    } catch (_) {}
  }

  function getGuidesExpandedId() {
    try {
      const raw = localStorage.getItem(GUIDES_EXPANDED_KEY);
      if (raw && typeof raw === "string" && raw.trim() !== "") return raw.trim();
    } catch (_) {}
    return null;
  }

  function saveGuidesExpandedId(id) {
    try {
      localStorage.setItem(GUIDES_EXPANDED_KEY, id == null ? "" : id);
    } catch (_) {}
  }

  function applyGuidesVisibility(container, sections, expandedId) {
    container.querySelectorAll(".guide-group[data-guide]").forEach((section) => {
      const guideId = section.getAttribute("data-guide");
      if (!expandedId || expandedId === "") {
        section.style.display = "";
      } else {
        section.style.display = expandedId === guideId ? "" : "none";
      }
    });
  }

  function buildGuideCard(item, grid, groupId) {
    const hasImage = !!(item.image && String(item.image).trim());
    const hasText = !!(item.text != null && String(item.text).trim() !== "");
    const hasLink = !!(item.url && String(item.url).trim());
    const titleStr = getGuideItemTitle(item);
    const imgSrc = hasImage ? ((item.image.startsWith("http://") || item.image.startsWith("https://")) ? item.image : (groupId != null && groupId !== "") ? (GUIDES_IMAGES_BASE + groupId + "/" + item.image) : item.image) : "";

    if (hasLink && !hasImage && !hasText) {
      const card = document.createElement("div");
      card.className = "guide-card guide-card-link-only";
      card.setAttribute("role", "listitem");
      if (titleStr) {
        const titleEl = document.createElement("h3");
        titleEl.className = "guide-card-title";
        titleEl.textContent = titleStr;
        card.appendChild(titleEl);
      }
      const linkEl = document.createElement("a");
      linkEl.className = "guide-card-link-label";
      linkEl.href = item.url;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = "Click Me 🌐";
      card.appendChild(linkEl);
      grid.appendChild(card);
      return;
    }

    const card = document.createElement("div");
    card.className = "guide-card";
    card.setAttribute("role", "listitem");
    if (titleStr) {
      const titleEl = document.createElement("h3");
      titleEl.className = "guide-card-title";
      titleEl.textContent = titleStr;
      card.appendChild(titleEl);
    }
    if (hasImage) {
      const img = document.createElement("img");
      img.className = "guide-card-img";
      img.src = imgSrc;
      img.alt = titleStr;
      img.loading = "lazy";
      card.appendChild(img);
    } else if (hasText) {
      const detailEl = document.createElement("div");
      detailEl.className = "guide-card-details";
      detailEl.textContent = String(item.text).trim();
      card.appendChild(detailEl);
    }
    card.addEventListener("click", (e) => {
      e.preventDefault();
      openGuideLightbox(item, groupId);
    });
    grid.appendChild(card);
  }

  async function loadGuidesPanel() {
    if (guidesPanelLoaded) return;
    const container = document.getElementById("guides-panel-content");
    const panel = document.getElementById("panel-guides");
    if (!container || !panel) return;

    let data = { groups: [] };
    try {
      const res = await fetch(DATA_BASE + "guides.json");
      if (res.ok) data = await res.json();
    } catch (_) {}
    if (!Array.isArray(data.groups) || data.groups.length === 0) {
      try {
        const resLocal = await fetch("hatopia-data/guides.json");
        if (resLocal.ok) data = await resLocal.json();
      } catch (_) {}
    }
    const groups = Array.isArray(data.groups) ? data.groups : [];
    if (groups.length === 0) {
      const msg = document.createElement("p");
      msg.className = "guides-empty-msg";
      msg.textContent = "No guides loaded. Add hatopia-data/guides.json or ensure it is available from the data source.";
      container.appendChild(msg);
      guidesPanelLoaded = true;
      return;
    }
    const defaultOrder = groups.map((g) => g.id);
    const order = getGuidesOrder(defaultOrder);
    const expandedId = getGuidesExpandedId();

    const sections = {};
    groups.forEach((group) => {
      const guideId = group.id;
      const section = document.createElement("section");
      section.className = "guide-group card list-card";
      section.id = "guide-" + guideId;
      section.setAttribute("data-guide", guideId);
      const isExpanded = expandedId === guideId;
      if (isExpanded) section.classList.add("is-expanded");

      const header = document.createElement("header");
      header.className = "list-header";
      const dragHandle = document.createElement("span");
      dragHandle.className = "group-drag-handle";
      dragHandle.setAttribute("draggable", "true");
      dragHandle.setAttribute("aria-label", "Drag to reorder group");
      dragHandle.setAttribute("data-guide", guideId);
      dragHandle.textContent = "⋮⋮";
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "group-toggle";
      toggleBtn.setAttribute("data-guide", guideId);
      toggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      const titleSpan = document.createElement("span");
      titleSpan.className = "list-title";
      titleSpan.innerHTML = "<h2>" + (group.label || guideId) + "</h2>";
      const chevron = document.createElement("span");
      chevron.className = "group-chevron";
      chevron.textContent = isExpanded ? "▲" : "▼";
      toggleBtn.appendChild(titleSpan);
      toggleBtn.appendChild(chevron);
      header.appendChild(dragHandle);
      header.appendChild(toggleBtn);

      const content = document.createElement("div");
      content.className = "group-content guide-group-content";
      const grid = document.createElement("div");
      grid.className = "guides-grid";
      grid.setAttribute("role", "list");
      content.appendChild(grid);

      section.appendChild(header);
      section.appendChild(content);
      sections[guideId] = { section, content, toggleBtn, chevron, grid, group };
    });

    order.forEach((guideId) => {
      if (sections[guideId]) container.appendChild(sections[guideId].section);
    });

    applyGuidesVisibility(container, sections, expandedId);

    function toggleGroup(groupId) {
      const section = document.getElementById("guide-" + groupId);
      if (!section) return;
      const rec = sections[groupId];
      if (!rec) return;
      const { toggleBtn, chevron } = rec;
      const currentlyExpanded = section.classList.contains("is-expanded");
      let newExpandedId = null;
      if (currentlyExpanded) {
        section.classList.remove("is-expanded");
        toggleBtn.setAttribute("aria-expanded", "false");
        chevron.textContent = "▼";
      } else {
        order.forEach((id) => {
          const s = document.getElementById("guide-" + id);
          const r = sections[id];
          if (s && r) {
            s.classList.remove("is-expanded");
            r.toggleBtn.setAttribute("aria-expanded", "false");
            r.chevron.textContent = "▼";
          }
        });
        section.classList.add("is-expanded");
        toggleBtn.setAttribute("aria-expanded", "true");
        chevron.textContent = "▲";
        newExpandedId = groupId;
      }
      saveGuidesExpandedId(newExpandedId);
      applyGuidesVisibility(container, sections, newExpandedId);
    }

    groups.forEach((group) => {
      const rec = sections[group.id];
      if (!rec) return;
      const { section, toggleBtn, chevron, grid } = rec;
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleGroup(group.id);
      });
      section.addEventListener("click", (e) => {
        if (e.target.closest(".group-drag-handle")) return;
        if (e.target.closest(".guide-card, .guide-card-link, .guide-card-link-only")) return;
        e.preventDefault();
        toggleGroup(group.id);
      });
      (group.items || []).forEach((item) => buildGuideCard(item, grid, group.id));
    });

    let draggedGuideId = null;
    container.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".group-drag-handle[data-guide]");
      if (!handle) return;
      const guideId = handle.getAttribute("data-guide");
      if (guideId) {
        draggedGuideId = guideId;
        e.dataTransfer.setData("text/plain", guideId);
        e.dataTransfer.effectAllowed = "move";
        const section = handle.closest(".guide-group");
        if (section) section.classList.add("group-dragging");
      }
    });
    container.addEventListener("dragend", () => {
      draggedGuideId = null;
      container.querySelectorAll(".guide-group.group-dragging").forEach((el) => el.classList.remove("group-dragging"));
      container.querySelectorAll(".guide-group.group-drag-over").forEach((el) => el.classList.remove("group-drag-over"));
    });
    container.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const overSection = e.target.closest(".guide-group");
        container.querySelectorAll(".guide-group.group-drag-over").forEach((el) => {
          if (el !== overSection) el.classList.remove("group-drag-over");
        });
        if (overSection && draggedGuideId && overSection.getAttribute("data-guide") !== draggedGuideId) {
          overSection.classList.add("group-drag-over");
        }
      }
    });
    container.addEventListener("dragleave", (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll(".guide-group.group-drag-over").forEach((el) => el.classList.remove("group-drag-over"));
      }
    });
    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.querySelectorAll(".guide-group.group-drag-over").forEach((el) => el.classList.remove("group-drag-over"));
      const guideId = e.dataTransfer.getData("text/plain");
      if (!guideId) return;
      const dropSection = e.target.closest(".guide-group");
      const draggedSection = document.getElementById("guide-" + guideId);
      if (!dropSection || !draggedSection || dropSection === draggedSection) return;
      container.insertBefore(draggedSection, dropSection);
      const newOrder = Array.from(container.querySelectorAll(".guide-group[data-guide]")).map((el) =>
        el.getAttribute("data-guide")
      );
      saveGuidesOrder(newOrder);
    });

    guidesPanelLoaded = true;
  }


  let infoData = null;
  let manifestData = null;

  async function fetchManifest() {
    if (manifestData) return manifestData;
    try {
      const res = await fetch(DATA_BASE + "manifest.json");
      if (res.ok) manifestData = await res.json();
    } catch (_) {}
    return manifestData;
  }

  async function fetchInfoData() {
    if (infoData) return infoData;
    try {
      const res = await fetch(DATA_BASE + "info.json?t=" + Date.now());
      if (res.ok) infoData = await res.json();
    } catch (_) {}
    return infoData;
  }

  const INFO_SECTIONS = [
    { key: "daily", label: "📆 Daily", folder: "Daily" },
    { key: "weekly", label: "📆 Weekly", folder: "Weekly" },
    { key: "seasonal", label: "🌞 Seasonal", folder: "Seasonal" },
    { key: "other", label: "📰 Other", folder: "Other" },
  ];

  const ROAMING_OPTIONS = [
    { value: "LOT 1", label: "🏚️ 1" }, { value: "LOT 2", label: "🏚️ 2" }, { value: "LOT 3", label: "🏚️ 3" }, { value: "LOT 4", label: "🏚️ 4" },
    { value: "LOT 5", label: "🏚️ 5" }, { value: "LOT 6", label: "🏚️ 6" }, { value: "LOT 7", label: "🏚️ 7" }, { value: "LOT 8", label: "🏚️ 8" },
    { value: "LOT 9", label: "🏚️ 9" }, { value: "LOT 10", label: "🏚️ 10" }, { value: "LOT 11", label: "🏚️ 11" }, { value: "LOT 12", label: "🏚️ 12" },
    { value: "🌳🌳", label: "🌳🌳" },
  ];
  const FLAWLESS_OPTIONS = [
    { value: "LOT 1", label: "🏚️ 1" }, { value: "LOT 2", label: "🏚️ 2" }, { value: "LOT 3", label: "🏚️ 3" }, { value: "LOT 4", label: "🏚️ 4" },
    { value: "LOT 5", label: "🏚️ 5" }, { value: "LOT 6", label: "🏚️ 6" }, { value: "LOT 7", label: "🏚️ 7" }, { value: "LOT 8", label: "🏚️ 8" },
    { value: "LOT 9", label: "🏚️ 9" }, { value: "LOT 10", label: "🏚️ 10" }, { value: "LOT 11", label: "🏚️ 11" }, { value: "LOT 12", label: "🏚️ 12" },
    { value: "⛰️🗻", label: "⛰️🗻" },
  ];

  /** Heartopia resets daily at 7:00 GMT+8. Game day = 7:00 D to 6:59:59 D+1 (GMT+8). Returns YYYY-MM-DD of current game day start.
   *  Date source: browser's clock (new Date()); we convert UTC to GMT+8 by adding 8 hours. */
  function getCurrentGameDayStartGMT8() {
    const now = new Date();
    const gmt8Ms = now.getTime() + 8 * 60 * 60 * 1000;
    const gmt8 = new Date(gmt8Ms);
    const hour = gmt8.getUTCHours();
    const y = gmt8.getUTCFullYear();
    const m = gmt8.getUTCMonth();
    const d = gmt8.getUTCDate();
    if (hour < 7) {
      const prev = new Date(Date.UTC(y, m, d - 1));
      return prev.getUTCFullYear() + "-" + String(prev.getUTCMonth() + 1).padStart(2, "0") + "-" + String(prev.getUTCDate()).padStart(2, "0");
    }
    return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  /** Game resets weekly at 7:00 Saturday GMT+8. Week = Sat 7am to next Sat 6:59:59. Returns YYYY-MM-DD of current week's Saturday. */
  function getCurrentWeeklyResetStartGMT8() {
    const now = new Date();
    const gmt8Ms = now.getTime() + 8 * 60 * 60 * 1000;
    const gmt8 = new Date(gmt8Ms);
    const hour = gmt8.getUTCHours();
    const y = gmt8.getUTCFullYear();
    const m = gmt8.getUTCMonth();
    const d = gmt8.getUTCDate();
    const dayOfWeek = gmt8.getUTCDay(); // 0=Sun, 6=Sat
    const daysBack = dayOfWeek === 6 && hour >= 7 ? 0 : dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    const sat = new Date(Date.UTC(y, m, d - daysBack));
    return sat.getUTCFullYear() + "-" + String(sat.getUTCMonth() + 1).padStart(2, "0") + "-" + String(sat.getUTCDate()).padStart(2, "0");
  }

  let infoPanelLoaded = false;

  async function loadInfoPanel() {
    if (infoPanelLoaded) return;
    const container = document.getElementById("info-panel-content");
    const panel = document.getElementById("panel-info");
    if (!container || !panel) return;

    const data = await fetchInfoData();
    if (!data) {
      container.innerHTML = "<p class=\"info-load-error\">Info could not be loaded. Check your connection and that the data repo is available.</p>";
      infoPanelLoaded = true;
      return;
    }
    const info = data;

    container.innerHTML = "";
    const manifest = await fetchManifest();

    INFO_SECTIONS.forEach((section) => {
      const sectionData = info[section.key] || {};
      const sectionEl = document.createElement("section");
      sectionEl.className = "info-section card";

      const titleEl = document.createElement("h2");
      titleEl.className = "info-section-title";
      titleEl.textContent = section.label;
      sectionEl.appendChild(titleEl);

      if (section.key === "daily") {
        const currentGameDay = getCurrentGameDayStartGMT8();
        const dateRoaming = String(sectionData.dateRoamingOak || sectionData.date || "").trim();
        const dateFlawless = String(sectionData.dateFlawlessFlouride || sectionData.date || "").trim();
        const roamingCurrent = dateRoaming && dateRoaming === currentGameDay;
        const flawlessCurrent = dateFlawless && dateFlawless === currentGameDay;
        const tooltipRoaming = "Data Date: " + (dateRoaming || "(none)") + "\nGame Date: " + currentGameDay + "\n" + (roamingCurrent ? "✅ Valid" : "❌ Expired");
        const tooltipFlawless = "Data Date: " + (dateFlawless || "(none)") + "\nGame Date: " + currentGameDay + "\n" + (flawlessCurrent ? "✅ Valid" : "❌ Expired");
        const roamingLabel = ROAMING_OPTIONS.find((o) => o.value === sectionData.roamingOak)?.label || sectionData.roamingOak || "—";
        const flawlessLabel = FLAWLESS_OPTIONS.find((o) => o.value === sectionData.flawlessFlouride)?.label || sectionData.flawlessFlouride || "—";

        const cardsRow = document.createElement("div");
        cardsRow.className = "info-value-cards-row";

        const weatherCard = document.createElement("div");
        weatherCard.className = "info-value-card card";
        const weatherTitle = document.createElement("h2");
        weatherTitle.className = "weather-card-title";
        weatherTitle.textContent = "Weather";
        const weatherWrap = document.createElement("div");
        weatherWrap.id = "weather-card-image-wrap";
        weatherWrap.className = "admin-value-card-image-wrap";
        weatherWrap.setAttribute("title", "");
        const weatherImg = document.createElement("img");
        weatherImg.id = "weather-card-img";
        weatherImg.className = "admin-value-card-img";
        weatherImg.src = "";
        weatherImg.alt = "Weather";
        weatherWrap.appendChild(weatherImg);
        weatherCard.appendChild(weatherTitle);
        weatherCard.appendChild(weatherWrap);
        cardsRow.appendChild(weatherCard);

        const roamingCard = document.createElement("div");
        roamingCard.className = "info-value-card card";
        const roamingTitle = document.createElement("h2");
        roamingTitle.className = "roaming-oak-card-title";
        roamingTitle.textContent = "Roaming Oak";
        const roamingWrap = document.createElement("div");
        roamingWrap.id = "roaming-card-image-wrap";
        roamingWrap.className = "admin-value-card-image-wrap" + (roamingCurrent ? " admin-value-card--valid" : " admin-value-card--expired");
        roamingWrap.setAttribute("title", tooltipRoaming);
        roamingWrap.setAttribute("aria-label", roamingCurrent ? "Current" : "Expired");
        const roamingImg = document.createElement("img");
        roamingImg.className = "admin-value-card-img";
        roamingImg.src = DATA_BASE + "images/info/tree.png";
        roamingImg.alt = "";
        const roamingOverlay = document.createElement("span");
        roamingOverlay.id = "roaming-oak-value";
        roamingOverlay.className = "admin-value-overlay";
        roamingOverlay.textContent = roamingLabel;
        roamingWrap.appendChild(roamingImg);
        roamingWrap.appendChild(roamingOverlay);
        roamingCard.appendChild(roamingTitle);
        roamingCard.appendChild(roamingWrap);
        cardsRow.appendChild(roamingCard);

        const flawlessCard = document.createElement("div");
        flawlessCard.className = "info-value-card card";
        const flawlessTitle = document.createElement("h2");
        flawlessTitle.className = "flawless-flouride-card-title";
        flawlessTitle.textContent = "Flawless Flouride";
        const flawlessWrap = document.createElement("div");
        flawlessWrap.id = "flawless-card-image-wrap";
        flawlessWrap.className = "admin-value-card-image-wrap" + (flawlessCurrent ? " admin-value-card--valid" : " admin-value-card--expired");
        flawlessWrap.setAttribute("title", tooltipFlawless);
        flawlessWrap.setAttribute("aria-label", flawlessCurrent ? "Current" : "Expired");
        const flawlessImg = document.createElement("img");
        flawlessImg.className = "admin-value-card-img";
        flawlessImg.src = DATA_BASE + "images/info/stone.png";
        flawlessImg.alt = "";
        const flawlessOverlay = document.createElement("span");
        flawlessOverlay.id = "flawless-flouride-value";
        flawlessOverlay.className = "admin-value-overlay";
        flawlessOverlay.textContent = flawlessLabel;
        flawlessWrap.appendChild(flawlessImg);
        flawlessWrap.appendChild(flawlessOverlay);
        flawlessCard.appendChild(flawlessTitle);
        flawlessCard.appendChild(flawlessWrap);
        cardsRow.appendChild(flawlessCard);

        sectionEl.appendChild(cardsRow);
      }

      const notesRow = document.createElement("div");
      notesRow.className = "info-notes-row";
      const notesLabel = document.createElement("label");
      notesLabel.className = "info-notes-label";
      notesLabel.textContent = "Notes:";
      const notesContent = document.createElement("div");
      notesContent.className = "info-notes-value";
      notesContent.textContent = sectionData.notes || "";
      notesRow.appendChild(notesLabel);
      notesRow.appendChild(notesContent);
      sectionEl.appendChild(notesRow);

      const grid = document.createElement("div");
      grid.className = "info-section-grid";
      grid.setAttribute("role", "list");
      const fromManifest = manifest && manifest.info && Array.isArray(manifest.info[section.key]) ? manifest.info[section.key] : [];
      const images = fromManifest.length > 0 ? fromManifest : (Array.isArray(sectionData.images) ? sectionData.images : []);
      const basePath = DATA_BASE + "images/info/" + section.folder + "/";
      images.forEach((filename) => {
        const imgSrc = basePath + filename;
        const title = filename.replace(/\.[^.]+$/, "");
        const card = document.createElement("div");
        card.className = "info-section-card";
        card.setAttribute("role", "listitem");
        const titleEl = document.createElement("h3");
        titleEl.className = "info-section-card-title";
        titleEl.textContent = title;
        const img = document.createElement("img");
        img.className = "info-section-card-img";
        img.src = imgSrc;
        img.alt = title;
        card.appendChild(titleEl);
        card.appendChild(img);
        card.addEventListener("click", () => openGuideLightbox({ image: imgSrc, title }));
        grid.appendChild(card);
      });
      sectionEl.appendChild(grid);

      container.appendChild(sectionEl);
    });

    syncWeatherCard();
    infoPanelLoaded = true;
  }

  let uploadedItems = [];
  let uploadsPanelInitialized = false;

  /** GMT+8 hour → "dawn"|"day"|"dusk"|"night". 7am-1pm dawn, 1pm-7pm day, 7pm-1am dusk, 1am-7am night. */
  function getCurrentWeatherTimeSlotGMT8() {
    const now = new Date();
    const gmt8Ms = now.getTime() + 8 * 60 * 60 * 1000;
    const gmt8 = new Date(gmt8Ms);
    const h = gmt8.getUTCHours();
    if (h >= 7 && h < 13) return "dawn";
    if (h >= 13 && h < 19) return "day";
    if (h >= 19 || h < 1) return "dusk";
    return "night"; // 1–6
  }

  /** Resolve weather image name: daily.weather[slot] overrides with meteor/rain/rainbow; else use slot (dawn/day/dusk/night). */
  function getResolvedWeatherImage() {
    const slot = getCurrentWeatherTimeSlotGMT8();
    const weather = infoData && infoData.daily && infoData.daily.weather ? infoData.daily.weather : {};
    const override = String(weather[slot] || "").trim().toLowerCase();
    if (override === "meteor" || override === "rain" || override === "rainbow") return override;
    return slot; // default: dawn, day, dusk, night
  }

  function syncWeatherCard() {
    const img = document.getElementById("weather-card-img");
    const wrap = document.getElementById("weather-card-image-wrap");
    if (!img || !wrap) return;
    const name = getResolvedWeatherImage();
    const slot = getCurrentWeatherTimeSlotGMT8();
    const weather = infoData && infoData.daily && infoData.daily.weather ? infoData.daily.weather : {};
    const override = String(weather[slot] || "").trim();
    const weatherLabel = override ? override.charAt(0).toUpperCase() + override.slice(1).toLowerCase() : "Sunny";
    img.src = DATA_BASE + "images/info/weather/" + name + ".png";
    wrap.setAttribute("title", "Time: " + slot + "\nWeather: " + weatherLabel);
  }

  function syncUploadsReadonly() {
    const daily = infoData && infoData.daily ? infoData.daily : {};
    const currentGameDay = getCurrentGameDayStartGMT8();
    const dateRoaming = String(daily.dateRoamingOak || daily.date || "").trim();
    const dateFlawless = String(daily.dateFlawlessFlouride || daily.date || "").trim();
    const roamingCurrent = dateRoaming && dateRoaming === currentGameDay;
    const flawlessCurrent = dateFlawless && dateFlawless === currentGameDay;

    const readOnlyRoaming = document.getElementById("uploads-roaming-oak");
    const readOnlyFlawless = document.getElementById("uploads-flawless-flouride");
    const roamingValueEl = document.getElementById("roaming-oak-value");
    const flawlessValueEl = document.getElementById("flawless-flouride-value");
    const roamingImageWrap = document.getElementById("roaming-card-image-wrap");
    const flawlessImageWrap = document.getElementById("flawless-card-image-wrap");

    if (readOnlyRoaming && daily.roamingOak) readOnlyRoaming.value = daily.roamingOak;
    if (readOnlyFlawless && daily.flawlessFlouride) readOnlyFlawless.value = daily.flawlessFlouride;
    if (roamingValueEl) {
      const label = ROAMING_OPTIONS.find((o) => o.value === daily.roamingOak)?.label || daily.roamingOak || "—";
      roamingValueEl.textContent = label;
    }
    if (flawlessValueEl) {
      const label = FLAWLESS_OPTIONS.find((o) => o.value === daily.flawlessFlouride)?.label || daily.flawlessFlouride || "—";
      flawlessValueEl.textContent = label;
    }

    const roamingTooltip = "Data Date: " + (dateRoaming || "(none)") + "\nGame Date: " + currentGameDay + "\n" + (roamingCurrent ? "✅ Valid" : "❌ Expired");
    const flawlessTooltip = "Data Date: " + (dateFlawless || "(none)") + "\nGame Date: " + currentGameDay + "\n" + (flawlessCurrent ? "✅ Valid" : "❌ Expired");
    if (roamingImageWrap) {
      roamingImageWrap.classList.toggle("admin-value-card--valid", roamingCurrent);
      roamingImageWrap.classList.toggle("admin-value-card--expired", !roamingCurrent);
      roamingImageWrap.setAttribute("title", roamingTooltip);
      roamingImageWrap.setAttribute("aria-label", roamingCurrent ? "Current" : "Expired");
    }
    if (flawlessImageWrap) {
      flawlessImageWrap.classList.toggle("admin-value-card--valid", flawlessCurrent);
      flawlessImageWrap.classList.toggle("admin-value-card--expired", !flawlessCurrent);
      flawlessImageWrap.setAttribute("title", flawlessTooltip);
      flawlessImageWrap.setAttribute("aria-label", flawlessCurrent ? "Current" : "Expired");
    }
  }

  function removeUploadedItem(id) {
    uploadedItems = uploadedItems.filter((item) => item.id !== id);
    renderUploadsGrid();
  }

  function renderUploadsGrid() {
    const grid = document.getElementById("uploads-grid");
    if (!grid) return;
    grid.innerHTML = "";
    uploadedItems.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "upload-card";
      card.setAttribute("role", "listitem");
      const trashBtn = document.createElement("button");
      trashBtn.type = "button";
      trashBtn.className = "upload-card-trash";
      trashBtn.setAttribute("aria-label", "Remove");
      trashBtn.textContent = "🗑️";
      trashBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeUploadedItem(item.id);
      });
      const title = document.createElement("h3");
      title.className = "upload-card-title";
      title.textContent = String(index + 1);
      const detail = document.createElement("div");
      detail.className = "upload-card-detail";
      if (item.dataUrl) {
        const img = document.createElement("img");
        img.src = item.dataUrl;
        img.alt = item.name || "Upload";
        img.className = "upload-card-img";
        detail.appendChild(img);
      } else {
        detail.textContent = item.name || "File " + (index + 1);
      }
      card.appendChild(trashBtn);
      card.appendChild(title);
      card.appendChild(detail);
      grid.appendChild(card);
    });
  }

  function addUploadedItem(fileOrBlob, name) {
    const id = "upload-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    const isBlob = fileOrBlob instanceof Blob;
    const isImage = isBlob && fileOrBlob.type.startsWith("image/");
    const item = { id, name: name || (fileOrBlob instanceof File ? fileOrBlob.name : "Pasted image") };
    if (fileOrBlob instanceof File) item.file = fileOrBlob;
    else item.blob = fileOrBlob;
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        item.dataUrl = reader.result;
        uploadedItems.push(item);
        renderUploadsGrid();
      };
      reader.readAsDataURL(fileOrBlob);
    } else {
      uploadedItems.push(item);
      renderUploadsGrid();
    }
  }

  async function initUploadsPanel() {
    await fetchInfoData();
    syncUploadsReadonly();

    const uploadBtn = document.getElementById("uploads-upload-btn");
    const fileInput = document.getElementById("uploads-file-input");
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length) {
          for (let i = 0; i < files.length; i++) addUploadedItem(files[i]);
          fileInput.value = "";
        }
      });
    }

    const panelUploads = document.getElementById("panel-uploads");
    if (panelUploads) {
      panelUploads.addEventListener("paste", (e) => {
        const dt = e.clipboardData;
        if (!dt || !dt.items) return;
        const active = document.activeElement;
        const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
        if (isInput) return;
        let added = 0;
        for (const item of dt.items) {
          if (item.kind !== "file") continue;
          const type = item.type;
          if (!type || !type.startsWith("image/")) continue;
          const blob = item.getAsFile();
          if (blob) {
            addUploadedItem(blob, "Pasted image");
            added += 1;
          }
        }
        if (added > 0) e.preventDefault();
      });
    }
  }

  function applyAdminTabVisibility() {
    const uploadsTab = document.getElementById("tab-uploads-btn");
    const uploadsPanel = document.getElementById("panel-uploads");
    const isAdmin = window.localStorage.getItem(ADMIN_KEY) === "1";
    if (uploadsTab) {
      if (isAdmin) {
        uploadsTab.classList.remove("admin-only-tab");
        uploadsTab.hidden = false;
        uploadsTab.removeAttribute("hidden");
        uploadsTab.style.display = "";
      } else {
        uploadsTab.classList.add("admin-only-tab");
        uploadsTab.hidden = true;
        uploadsTab.setAttribute("hidden", "hidden");
        uploadsTab.style.display = "none";
      }
    }
    if (uploadsPanel) {
      if (isAdmin) {
        uploadsPanel.hidden = false;
        uploadsPanel.removeAttribute("hidden");
        uploadsPanel.style.display = "";
      } else {
        uploadsPanel.hidden = true;
        uploadsPanel.setAttribute("hidden", "hidden");
        uploadsPanel.style.display = "none";
      }
    }
    // Sync which panel is actually shown to the currently selected tab (fixes Admin load: Uploads panel was visible while Info tab selected)
    const selectedBtn = document.querySelector(".tab-btn.is-selected");
    const panelId = selectedBtn?.getAttribute("data-panel");
    const panelDashboard = document.getElementById("panel-dashboard");
    const panelGuides = document.getElementById("panel-guides");
    const panelInfo = document.getElementById("panel-info");
    if (panelId && panelDashboard && panelGuides && panelInfo && uploadsPanel) {
      panelDashboard.hidden = panelId !== "dashboard";
      panelGuides.hidden = panelId !== "guides";
      panelInfo.hidden = panelId !== "info";
      uploadsPanel.hidden = panelId !== "uploads";
    }
  }

  function initTodoDrag() {
    const configs = [
      [seaList, "SEA", false],
      [asiaList, "ASIA", false],
      [twList, "TW", false],
      [seaListCompleted, "SEA", true],
      [asiaListCompleted, "ASIA", true],
      [twListCompleted, "TW", true],
    ];
    configs.forEach(([list, groupId, completed]) => {
      if (!list) return;
      list.addEventListener("dragstart", (e) => {
        const handle = e.target.closest(".todo-drag-handle");
        if (!handle) return;
        const li = handle.closest(".todo-item");
        if (!li) return;
        e.dataTransfer.setData("text/plain", li.dataset.id || "");
        e.dataTransfer.effectAllowed = "move";
        li.classList.add("todo-dragging");
      });
      list.addEventListener("dragend", () => {
        list.querySelectorAll(".todo-item.todo-dragging").forEach((el) => el.classList.remove("todo-dragging"));
      });
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      list.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId) return;
        const dropLi = e.target.closest(".todo-item");
        if (!dropLi || dropLi.dataset.id === draggedId) return;
        const items = Array.from(list.querySelectorAll(".todo-item"));
        const orderedIds = items.map((el) => el.dataset.id).filter(Boolean);
        const insertIndex = orderedIds.indexOf(dropLi.dataset.id);
        if (insertIndex === -1) return;
        const without = orderedIds.filter((id) => id !== draggedId);
        const newOrder = without.slice(0, insertIndex).concat(draggedId, without.slice(insertIndex));
        reorderTodosInGroup(groupId, completed, newOrder);
      });
    });
  }

  function updateTabIndicator() {
    const indicator = document.querySelector(".tab-nav-indicator");
    const selected = document.querySelector(".tab-btn.is-selected");
    if (!indicator || !selected) return;
    const nav = selected.closest(".tab-nav");
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = selected.getBoundingClientRect();
    indicator.style.left = (btnRect.left - navRect.left) + "px";
    indicator.style.width = btnRect.width + "px";
  }

  function initTabsAndFlowers() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const panelDashboard = document.getElementById("panel-dashboard");
    const panelGuides = document.getElementById("panel-guides");
    const panelInfo = document.getElementById("panel-info");
    const panelUploads = document.getElementById("panel-uploads");
    if (!panelDashboard || !panelGuides || !panelInfo || !panelUploads) return;
    requestAnimationFrame(updateTabIndicator);
    window.addEventListener("resize", updateTabIndicator);
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const panelId = btn.getAttribute("data-panel");
        tabBtns.forEach((b) => {
          b.classList.toggle("is-selected", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        updateTabIndicator();
        panelDashboard.hidden = panelId !== "dashboard";
        panelGuides.hidden = panelId !== "guides";
        panelInfo.hidden = panelId !== "info";
        panelUploads.hidden = panelId !== "uploads";
        if (panelId === "guides") loadGuidesPanel();
        if (panelId === "info") {
          loadInfoPanel();
          syncWeatherCard();
        }
        if (panelId === "uploads") {
          syncUploadsReadonly();
          if (!uploadsPanelInitialized) {
            initUploadsPanel();
            uploadsPanelInitialized = true;
          }
        }
      });
    });
  }

  function initVersionFootnote() {
    let el = document.getElementById("hatopia-version-footnote");
    let hideTimer = null;
    if (!el) {
      el = document.createElement("div");
      el.id = "hatopia-version-footnote";
      el.className = "hatopia-version-footnote";
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    function show() {
      const styleVer = getComputedStyle(document.documentElement).getPropertyValue("--hatopia-version").trim().replace(/^["']|["']$/g, "") || "—";
      const appVer = window.HatopiaAppVersion || "—";
      const shellVer = window.HatopiaShellVersion || "—";
      const versionText = `app ${appVer} · shell ${shellVer} · style ${styleVer}`;
      const versionLines = `app: ${appVer}\nshell: ${shellVer}\nstyle: ${styleVer}`;
      el.innerHTML = "<div class=\"hatopia-version-toast-title\">Versions</div><pre class=\"hatopia-version-toast-details\">" + versionLines.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(versionText).catch(() => {});
      }
      el.classList.add("hatopia-version-footnote--visible");
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        el.classList.remove("hatopia-version-footnote--visible");
        hideTimer = null;
      }, 2500);
    }
    document.addEventListener("dblclick", show, { passive: true });
  }

  let settingsVariantDropdownsInitialized = false;
  function initSettingsVariantDropdownsOnce() {
    if (settingsVariantDropdownsInitialized) return;
    const lightVariantBtn = document.getElementById("settings-light-variant-btn");
    const lightVariantListbox = document.querySelector("#light-variant-dropdown .theme-variant-listbox");
    const lightVariantOpts = document.querySelectorAll("#light-variant-dropdown .theme-variant-opt");
    const darkVariantBtn = document.getElementById("settings-dark-variant-btn");
    const darkVariantListbox = document.querySelector("#dark-variant-dropdown .theme-variant-listbox");
    const darkVariantOpts = document.querySelectorAll("#dark-variant-dropdown .theme-variant-opt");
    const d = document.getElementById("settings-dialog");
    if (!lightVariantBtn || !lightVariantListbox || !darkVariantBtn || !darkVariantListbox || !d) return;
    function syncVariantUI(btn, opts, key, defaultColor) {
      const val = localStorage.getItem(key) || "default";
      const opt = Array.from(opts).find((o) => o.dataset.value === val);
      if (btn && opt) {
        const swatch = btn.querySelector(".theme-variant-swatch");
        const text = btn.querySelector(".theme-variant-text");
        if (swatch) swatch.style.background = opt.dataset.color || defaultColor;
        if (text) text.textContent = opt.dataset.value === "default" ? "Default" : opt.dataset.value.charAt(0).toUpperCase() + opt.dataset.value.slice(1);
      }
    }
    function setupVariantDropdown(btn, listbox, opts, key, defaultColor) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = listbox.hidden;
        listbox.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
      });
      opts.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const val = opt.dataset.value;
          localStorage.setItem(key, val);
          applyTheme();
          syncVariantUI(btn, opts, key, defaultColor);
          listbox.hidden = true;
          listbox.setAttribute("hidden", "");
          btn.setAttribute("aria-expanded", "false");
        });
      });
    }
    setupVariantDropdown(lightVariantBtn, lightVariantListbox, lightVariantOpts, LIGHT_VARIANT_KEY, "#e2e8f0");
    setupVariantDropdown(darkVariantBtn, darkVariantListbox, darkVariantOpts, DARK_VARIANT_KEY, "#334155");
    d.addEventListener("click", (e) => {
      if (!e.target.closest(".theme-variant-dropdown")) {
        if (lightVariantListbox) lightVariantListbox.hidden = true;
        if (darkVariantListbox) darkVariantListbox.hidden = true;
        if (lightVariantBtn) lightVariantBtn.setAttribute("aria-expanded", "false");
        if (darkVariantBtn) darkVariantBtn.setAttribute("aria-expanded", "false");
      }
    });
    settingsVariantDropdownsInitialized = true;
  }

  function openSettingsModal(isFirstTime) {
    const d = document.getElementById("settings-dialog");
    const doneBtn = document.getElementById("settings-dialog-done");
    const resetDaily = document.getElementById("setup-reset-daily");
    const resetWeekly = document.getElementById("setup-reset-weekly");
    const themeModeSelect = document.getElementById("settings-theme-mode");
    const lightVariantBtn = document.getElementById("settings-light-variant-btn");
    const lightVariantOpts = document.querySelectorAll("#light-variant-dropdown .theme-variant-opt");
    const darkVariantBtn = document.getElementById("settings-dark-variant-btn");
    const darkVariantOpts = document.querySelectorAll("#dark-variant-dropdown .theme-variant-opt");
    if (!d || !doneBtn) return;
    initSettingsVariantDropdownsOnce();
    const daily = (localStorage.getItem(SETUP_RESET_DAILY_KEY) || "never").toLowerCase();
    const weekly = (localStorage.getItem(SETUP_RESET_WEEKLY_KEY) || "never").toLowerCase();
    if (resetDaily) resetDaily.value = ["never", "always", "ask"].includes(daily) ? daily : "never";
    if (resetWeekly) resetWeekly.value = ["never", "always", "ask"].includes(weekly) ? weekly : "never";
    const mode = localStorage.getItem(THEME_MODE_KEY) || "system";
    let lightV = localStorage.getItem(LIGHT_VARIANT_KEY) || "default";
    let darkV = localStorage.getItem(DARK_VARIANT_KEY) || "default";
    lightV = ["default", "pink", "blue"].includes(lightV) ? lightV : "default";
    darkV = ["default", "pink", "blue"].includes(darkV) ? darkV : "default";
    if (themeModeSelect) themeModeSelect.value = ["light", "dark", "system"].includes(mode) ? mode : "system";
    if (lightVariantBtn && lightVariantOpts.length) {
      const opt = Array.from(lightVariantOpts).find((o) => o.dataset.value === lightV);
      if (opt) {
        const swatch = lightVariantBtn.querySelector(".theme-variant-swatch");
        const text = lightVariantBtn.querySelector(".theme-variant-text");
        if (swatch) swatch.style.background = opt.dataset.color || "#e2e8f0";
        if (text) text.textContent = opt.dataset.value === "default" ? "Default" : opt.dataset.value.charAt(0).toUpperCase() + opt.dataset.value.slice(1);
      }
    }
    if (darkVariantBtn && darkVariantOpts.length) {
      const opt = Array.from(darkVariantOpts).find((o) => o.dataset.value === darkV);
      if (opt) {
        const swatch = darkVariantBtn.querySelector(".theme-variant-swatch");
        const text = darkVariantBtn.querySelector(".theme-variant-text");
        if (swatch) swatch.style.background = opt.dataset.color || "#334155";
        if (text) text.textContent = opt.dataset.value === "default" ? "Default" : opt.dataset.value.charAt(0).toUpperCase() + opt.dataset.value.slice(1);
      }
    }
    if (themeModeSelect) {
      themeModeSelect.onchange = () => {
        localStorage.setItem(THEME_MODE_KEY, themeModeSelect.value);
        applyTheme();
      };
    }
    d.showModal();
    d.addEventListener("cancel", (e) => e.preventDefault());
    doneBtn.onclick = () => {
      const dVal = (resetDaily?.value || "never").toLowerCase();
      const wVal = (resetWeekly?.value || "never").toLowerCase();
      localStorage.setItem(SETUP_DONE_KEY, "1");
      localStorage.setItem(SETUP_RESET_DAILY_KEY, dVal);
      localStorage.setItem(SETUP_RESET_WEEKLY_KEY, wVal);
      if (themeModeSelect) localStorage.setItem(THEME_MODE_KEY, themeModeSelect.value);
      localStorage.setItem(LIGHT_VARIANT_KEY, localStorage.getItem(LIGHT_VARIANT_KEY) || "default");
      localStorage.setItem(DARK_VARIANT_KEY, localStorage.getItem(DARK_VARIANT_KEY) || "default");
      applyTheme();
      d.close();
      if (isFirstTime) runRestOfInit();
    };
  }

  function showDateChangedModal(showDaily, showWeekly, currentGameDay, currentWeekly) {
    const d = document.getElementById("date-changed-dialog");
    const rowDaily = document.getElementById("date-changed-row-daily");
    const rowWeekly = document.getElementById("date-changed-row-weekly");
    const chkDaily = document.getElementById("date-changed-check-daily");
    const chkWeekly = document.getElementById("date-changed-check-weekly");
    const chkDontAsk = document.getElementById("date-changed-check-dont-ask");
    const btnYes = document.getElementById("date-changed-dialog-yes");
    const btnNo = document.getElementById("date-changed-dialog-no");
    if (!d || !chkDaily || !chkWeekly || !btnYes || !btnNo) return;
    if (rowDaily) rowDaily.style.display = showDaily ? "" : "none";
    if (rowWeekly) rowWeekly.style.display = showWeekly ? "" : "none";
    chkDaily.checked = !!showDaily;
    chkWeekly.checked = !!showWeekly;
    if (chkDontAsk) chkDontAsk.checked = false;
    d.showModal();
    const preventClose = (e) => e.preventDefault();
    d.addEventListener("cancel", preventClose);
    function cleanup() {
      d.removeEventListener("cancel", preventClose);
      d.close();
    }
    function onDismiss(resetTypes) {
      if (chkDontAsk?.checked) {
        localStorage.setItem(DONT_ASK_RESET_MODAL_GAME_DAY_KEY, currentGameDay);
      }
      if (resetTypes.length > 0) {
        resetAllToActive(resetTypes);
        if (resetTypes.includes("daily")) localStorage.setItem(LAST_DAILY_RESET_KEY, currentGameDay);
        if (resetTypes.includes("weekly")) localStorage.setItem(LAST_WEEKLY_RESET_KEY, currentWeekly);
      }
      cleanup();
    }
    btnYes.addEventListener(
      "click",
      () => {
        const types = [];
        if (showDaily && chkDaily.checked) types.push("daily");
        if (showWeekly && chkWeekly.checked) types.push("weekly");
        onDismiss(types);
      },
      { once: true }
    );
    btnNo.addEventListener(
      "click",
      () => onDismiss([]),
      { once: true }
    );
  }

  function runAutoResetOnLoad() {
    const resetDaily = (localStorage.getItem(SETUP_RESET_DAILY_KEY) || "never").toLowerCase();
    const resetWeekly = (localStorage.getItem(SETUP_RESET_WEEKLY_KEY) || "never").toLowerCase();
    const currentGameDay = getCurrentGameDayStartGMT8();
    const currentWeekly = getCurrentWeeklyResetStartGMT8();
    const lastDaily = localStorage.getItem(LAST_DAILY_RESET_KEY) || "";
    const lastWeekly = localStorage.getItem(LAST_WEEKLY_RESET_KEY) || "";
    const dailyDue = lastDaily !== currentGameDay;
    const weeklyDue = lastWeekly !== currentWeekly;
    const needAskDaily = resetDaily === "ask" && dailyDue;
    const needAskWeekly = resetWeekly === "ask" && weeklyDue;
    const skipModal = localStorage.getItem(DONT_ASK_RESET_MODAL_GAME_DAY_KEY) === currentGameDay;
    if (needAskDaily || needAskWeekly) {
      if (!skipModal) {
        const showDaily = resetDaily !== "never" && dailyDue;
        const showWeekly = resetWeekly !== "never" && weeklyDue;
        showDateChangedModal(showDaily, showWeekly, currentGameDay, currentWeekly);
      } else {
        if (resetDaily === "always" && dailyDue) {
          resetAllToActive(["daily"]);
          localStorage.setItem(LAST_DAILY_RESET_KEY, currentGameDay);
        }
        if (resetWeekly === "always" && weeklyDue) {
          resetAllToActive(["weekly"]);
          localStorage.setItem(LAST_WEEKLY_RESET_KEY, currentWeekly);
        }
      }
      return;
    }
    if (resetDaily === "always" && dailyDue) {
      resetAllToActive(["daily"]);
      localStorage.setItem(LAST_DAILY_RESET_KEY, currentGameDay);
    }
    if (resetWeekly === "always" && weeklyDue) {
      resetAllToActive(["weekly"]);
      localStorage.setItem(LAST_WEEKLY_RESET_KEY, currentWeekly);
    }
  }

  function init() {
    applyAdminTabVisibility();
    initGuideLightbox();

    if (localStorage.getItem(SETUP_DONE_KEY) !== "1") {
      openSettingsModal(true);
      return;
    }

    runRestOfInit();
  }

  function runRestOfInit() {
    if (
      !form ||
      !input ||
      !subtaskDraftInput ||
      !subtaskDraftAddBtn ||
      !subtaskDraftList ||
      !typeSelect ||
      !groupSelect ||
      !seaList ||
      !asiaList ||
      !twList ||
      !emptyState ||
      !countEl
    ) {
      console.error("Hatopia To-Do: missing DOM elements.");
      return;
    }

    /* SEA_ONLY: default true; set localStorage "hatopia_sea_only" to "0" to show all groups */
    seaOnlyMode = window.localStorage.getItem(SEA_ONLY_KEY) !== "0";
    /* DISABLE_ASIA: default false; set localStorage "hatopia_disable_asia" to "1" to hide ASIA and skip it in "all groups" */
    disableAsiaMode = window.localStorage.getItem(DISABLE_ASIA_KEY) === "1";
    applySeaOnlyMode();

    loadFromStorage();
    renderTodos();
    runAutoResetOnLoad();
    renderDraftSubtasks();
    applyGroupOrder();

    const themeModeBtn = document.getElementById("theme-mode-btn");
    const themeModeListbox = document.getElementById("theme-mode-listbox");
    const themeOpts = document.querySelectorAll(".theme-mode-opt");
    if (themeModeBtn && themeModeListbox && themeOpts.length) {
      function setThemeMode(val) {
        localStorage.setItem(THEME_MODE_KEY, val);
        applyTheme();
        themeOpts.forEach((o) => o.setAttribute("aria-selected", o.dataset.value === val ? "true" : "false"));
      }
      themeModeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = themeModeListbox.hidden;
        themeModeListbox.hidden = !open;
        themeModeBtn.setAttribute("aria-expanded", String(open));
      });
      themeOpts.forEach((opt) => {
        opt.addEventListener("click", () => {
          setThemeMode(opt.dataset.value);
          themeModeListbox.hidden = true;
          themeModeBtn.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("click", (e) => {
        if (!themeModeListbox.hidden && !themeModeBtn.contains(e.target) && !themeModeListbox.contains(e.target)) {
          themeModeListbox.hidden = true;
          themeModeBtn.setAttribute("aria-expanded", "false");
        }
      });
      const currentMode = localStorage.getItem(THEME_MODE_KEY) || "system";
      themeOpts.forEach((o) => o.setAttribute("aria-selected", o.dataset.value === currentMode ? "true" : "false"));
    }

    const btnSettings = document.getElementById("btn-settings");
    if (btnSettings) btnSettings.addEventListener("click", () => openSettingsModal(false));

    initTabsAndFlowers();
    initTodoDrag();
    initVersionFootnote();
    loadInfoPanel();

    document.getElementById("send-discord")?.addEventListener("click", sendToDiscord);
    document.getElementById("export-tasks")?.addEventListener("click", exportTasks);
    const exportDialog = document.getElementById("export-dialog");
    const exportGroupSelect = document.getElementById("export-group-select");
    document.getElementById("export-dialog-confirm")?.addEventListener("click", () => {
      doExport(exportGroupSelect?.value || "all");
      exportDialog?.close();
    });
    document.getElementById("export-dialog-cancel")?.addEventListener("click", () => exportDialog?.close());

    const importBtn = document.getElementById("import-tasks");
    const importFile = document.getElementById("import-file");
    if (importBtn && importFile) {
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          importTasks(file);
          importFile.value = "";
        }
      });
    }

    form.addEventListener("submit", handleSubmit);

    const addTaskDialog = document.getElementById("add-task-dialog");
    const btnAddTask = document.getElementById("btn-add-task");
    if (btnAddTask && addTaskDialog) {
      btnAddTask.addEventListener("click", () => {
        addTaskDialog.showModal();
        input?.focus();
      });
      document.getElementById("add-task-dialog-cancel")?.addEventListener("click", () => addTaskDialog.close());
    }

    const resetDialog = document.getElementById("reset-dialog");
    const btnReset = document.getElementById("btn-reset");
    const resetCheckAll = document.getElementById("reset-check-all");
    const resetCheckDaily = document.getElementById("reset-check-daily");
    const resetCheckWeekly = document.getElementById("reset-check-weekly");
    const resetCheckSeasonal = document.getElementById("reset-check-seasonal");
    const resetCheckOther = document.getElementById("reset-check-other");
    const resetDialogConfirm = document.getElementById("reset-dialog-confirm");
    const resetDialogCancel = document.getElementById("reset-dialog-cancel");
    if (btnReset && resetDialog) {
      btnReset.addEventListener("click", () => {
        if (resetCheckDaily) resetCheckDaily.checked = true;
        if (resetCheckWeekly) resetCheckWeekly.checked = false;
        if (resetCheckSeasonal) resetCheckSeasonal.checked = false;
        if (resetCheckOther) resetCheckOther.checked = false;
        if (resetCheckAll) resetCheckAll.checked = false;
        resetDialog.showModal();
      });
      if (resetCheckAll && resetCheckDaily && resetCheckWeekly && resetCheckSeasonal && resetCheckOther) {
        resetCheckAll.addEventListener("change", () => {
          const on = resetCheckAll.checked;
          resetCheckDaily.checked = on;
          resetCheckWeekly.checked = on;
          resetCheckSeasonal.checked = on;
          resetCheckOther.checked = on;
        });
        function syncResetAll() {
          const all = resetCheckDaily.checked && resetCheckWeekly.checked && resetCheckSeasonal.checked && resetCheckOther.checked;
          resetCheckAll.checked = all;
        }
        resetCheckDaily.addEventListener("change", syncResetAll);
        resetCheckWeekly.addEventListener("change", syncResetAll);
        resetCheckSeasonal.addEventListener("change", syncResetAll);
        resetCheckOther.addEventListener("change", syncResetAll);
      }
      if (resetDialogConfirm) {
        resetDialogConfirm.addEventListener("click", () => {
          const types = [];
          if (resetCheckDaily?.checked) types.push("daily");
          if (resetCheckWeekly?.checked) types.push("weekly");
          if (resetCheckSeasonal?.checked) types.push("seasonal");
          if (resetCheckOther?.checked) types.push("other");
          resetAllToActive(types.length === 4 ? "all" : types);
          if (resetCheckDaily?.checked) localStorage.setItem(LAST_DAILY_RESET_KEY, getCurrentGameDayStartGMT8());
          if (resetCheckWeekly?.checked) localStorage.setItem(LAST_WEEKLY_RESET_KEY, getCurrentWeeklyResetStartGMT8());
          resetDialog.close();
        });
      }
      if (resetDialogCancel) resetDialogCancel.addEventListener("click", () => resetDialog.close());
    }

    document.addEventListener("click", (e) => {
      const groupToggle = e.target.closest(".group-toggle");
      if (groupToggle) {
        const section = groupToggle.closest(".list-card");
        if (section) {
          section.classList.toggle("is-expanded");
          const expanded = section.classList.contains("is-expanded");
          const chevron = section.querySelector(".group-chevron");
          if (chevron) chevron.textContent = expanded ? "▲" : "▼";
          groupToggle.setAttribute("aria-expanded", expanded);
        }
        return;
      }
      const pendingToggle = e.target.closest(".pending-toggle");
      if (pendingToggle) {
        const wrapper = pendingToggle.closest(".pending-wrapper");
        if (wrapper) {
          wrapper.classList.toggle("is-expanded");
          const chevron = wrapper.querySelector(".pending-chevron");
          if (chevron) chevron.textContent = wrapper.classList.contains("is-expanded") ? "▲" : "▼";
          pendingToggle.setAttribute("aria-expanded", wrapper.classList.contains("is-expanded"));
        }
        return;
      }
      const completedToggle = e.target.closest(".completed-toggle");
      if (completedToggle) {
        const wrapper = completedToggle.closest(".completed-wrapper");
        if (wrapper) {
          wrapper.classList.toggle("is-expanded");
          const chevron = wrapper.querySelector(".completed-chevron");
          if (chevron) chevron.textContent = wrapper.classList.contains("is-expanded") ? "▲" : "▼";
          completedToggle.setAttribute("aria-expanded", wrapper.classList.contains("is-expanded"));
        }
      }
    });

    const main = document.querySelector(".app-main");
    const scrollContainer = main?.querySelector(".main-content-scroll");
    let draggedGroupId = null;
    if (scrollContainer) {
      scrollContainer.addEventListener("dragstart", (e) => {
        const handle = e.target.closest(".group-drag-handle");
        if (!handle) return;
        const groupId = handle.getAttribute("data-group");
        if (groupId) {
          draggedGroupId = groupId;
          e.dataTransfer.setData("text/plain", groupId);
          e.dataTransfer.effectAllowed = "move";
          const section = handle.closest(".list-card");
          if (section) section.classList.add("group-dragging");
        }
      });
      scrollContainer.addEventListener("dragend", () => {
        draggedGroupId = null;
        scrollContainer.querySelectorAll(".list-card.group-dragging").forEach((el) =>
          el.classList.remove("group-dragging")
        );
        scrollContainer.querySelectorAll(".list-card.group-drag-over").forEach((el) =>
          el.classList.remove("group-drag-over")
        );
      });
      scrollContainer.addEventListener("dragover", (e) => {
        if (e.dataTransfer.types.includes("text/plain")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const overSection = e.target.closest(".list-card");
          scrollContainer.querySelectorAll(".list-card.group-drag-over").forEach((el) => {
            if (el !== overSection) el.classList.remove("group-drag-over");
          });
          if (overSection && draggedGroupId && overSection.id !== "group-" + draggedGroupId) {
            overSection.classList.add("group-drag-over");
          }
        }
      });
      scrollContainer.addEventListener("dragleave", (e) => {
        if (!scrollContainer.contains(e.relatedTarget)) {
          scrollContainer.querySelectorAll(".list-card.group-drag-over").forEach((el) =>
            el.classList.remove("group-drag-over")
          );
        }
      });
      scrollContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        scrollContainer.querySelectorAll(".list-card.group-drag-over").forEach((el) =>
          el.classList.remove("group-drag-over")
        );
        const groupId = e.dataTransfer.getData("text/plain");
        if (!groupId) return;
        const dropSection = e.target.closest(".list-card");
        const draggedSection = document.getElementById("group-" + groupId);
        if (!dropSection || !draggedSection || dropSection === draggedSection) return;
        scrollContainer.insertBefore(draggedSection, dropSection);
        const newOrder = Array.from(scrollContainer.querySelectorAll(".list-card[data-group]")).map(
          (el) => el.getAttribute("data-group")
        );
        saveGroupOrder(newOrder);
      });
    }

    subtaskDraftAddBtn.addEventListener("click", () => {
      if (!subtaskDraftInput) return;
      const text = subtaskDraftInput.value.trim();
      if (!text) return;
      draftSubtasks.push({
        id: createId(),
        text,
        completed: false,
      });
      subtaskDraftInput.value = "";
      renderDraftSubtasks();
    });

    subtaskDraftInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        subtaskDraftAddBtn.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

