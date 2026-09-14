(() => {
  const grid = document.getElementById("grid");
  const scroller = document.getElementById("scroller");
  const meta = document.getElementById("meta");
  const live = document.getElementById("live");
  const todayButton = document.getElementById("todayButton");

  const habits = [
    ["Move", "#FFD534"],
    ["Cook", "#FF7A59"],
    ["Read", "#6BCB83"],
    ["Write", "#EF6BA8"],
    ["Stretch", "#9C7BE8"],
    ["Outside", "#70A9F3"],
    ["Practice", "#F19A45"],
    ["Sleep", "#E9A0A0"]
  ];

  const faces = ["•ᴗ•", "^ᴗ^", "•◡•", "˘ᴗ˘", "•o•", "•⌣•", "^‿^", "•‿•"];
  const weekday = ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const HISTORY_DAYS = 180;
  const FUTURE_DAYS = 60;
  const STORAGE_KEY = "habit-grid-v1";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const start = new Date(today);
  start.setDate(start.getDate() - HISTORY_DAYS);

  const dates = [];
  for (let i = 0; i <= HISTORY_DAYS + FUTURE_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }

  const todayIndex = dates.findIndex((d) => sameDay(d, today));

  grid.style.gridTemplateColumns = `var(--label-w) repeat(${dates.length}, var(--cell))`;
  grid.style.gridTemplateRows = `var(--head-h) repeat(${habits.length}, var(--cell))`;

  const state = loadState();

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function habitKey(habitIndex, date) {
    return `${habitIndex}:${dateKey(date)}`;
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isFuture(date) {
    return date.getTime() > today.getTime();
  }

  function readableDate(date) {
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state]));
  }

  function buildFlower(face) {
    return `
      <span class="flower-wrap" aria-hidden="true">
        <span class="flower">
          <span class="petal p1"></span>
          <span class="petal p2"></span>
          <span class="petal p3"></span>
          <span class="petal p4"></span>
          <span class="petal p5"></span>
          <span class="center"></span>
          <span class="face">${face}</span>
        </span>
      </span>
      <span class="wash" aria-hidden="true"></span>
    `;
  }

  const corner = document.createElement("div");
  corner.className = "corner";
  grid.appendChild(corner);

  dates.forEach((date, column) => {
    const previous = column > 0 ? dates[column - 1] : null;
    const monthStart = !previous || previous.getMonth() !== date.getMonth();

    const el = document.createElement("div");
    el.className =
      "date" +
      (monthStart ? " month-start" : "") +
      (column === todayIndex ? " today" : "");

    el.innerHTML = `
      ${monthStart ? `<span class="month">${monthNames[date.getMonth()]}</span>` : ""}
      <span>${weekday[date.getDay()]}</span>
      <span class="day-number">${date.getDate()}</span>
    `;

    grid.appendChild(el);
  });

  habits.forEach(([habitName, habitColor], habitIndex) => {
    const label = document.createElement("div");
    label.className = "habit-label";
    label.textContent = habitName;
    grid.appendChild(label);

    dates.forEach((date, column) => {
      const previous = column > 0 ? dates[column - 1] : null;
      const monthStart = !previous || previous.getMonth() !== date.getMonth();
      const future = isFuture(date);
      const storedKey = habitKey(habitIndex, date);
      const completed = state.has(storedKey);

      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "cell" +
        (completed ? " done" : "") +
        (column === todayIndex ? " today-cell" : "") +
        (future ? " future" : "") +
        (monthStart ? " month-start" : "");

      button.style.setProperty("--habit", habitColor);
      button.disabled = future;
      button.innerHTML = buildFlower(faces[(habitIndex + column) % faces.length]);

      setAriaLabel(button, habitName, date, completed, future);

      button.addEventListener("click", () => {
        toggleHabit(button, habitIndex, habitName, date);
      });

      grid.appendChild(button);
    });
  });

  function setAriaLabel(button, habitName, date, completed, future = false) {
    let label = `${habitName}, ${readableDate(date)}`;
    if (completed) label += ", completed";
    if (future) label += ", future date";
    button.setAttribute("aria-label", label);
  }

  function toggleHabit(button, habitIndex, habitName, date) {
    if (button.classList.contains("animating")) return;

    const storedKey = habitKey(habitIndex, date);
    const completed = state.has(storedKey);

    if (completed) {
      state.delete(storedKey);
      button.classList.remove("done");
      setAriaLabel(button, habitName, date, false);
      live.textContent = `${habitName} marked incomplete for ${readableDate(date)}`;
      saveState();
      updateMeta();
      return;
    }

    state.add(storedKey);
    saveState();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      button.classList.add("done");
      setAriaLabel(button, habitName, date, true);
      live.textContent = `${habitName} completed for ${readableDate(date)}`;
      updateMeta();
      return;
    }

    button.classList.add("animating");

    setTimeout(() => {
      button.classList.add("done");
    }, 820);

    setTimeout(() => {
      button.classList.remove("animating");
      setAriaLabel(button, habitName, date, true);
      live.textContent = `${habitName} completed for ${readableDate(date)}`;
      updateMeta();
    }, 1050);
  }

  function updateMeta() {
    let count = 0;
    habits.forEach((_, habitIndex) => {
      if (state.has(habitKey(habitIndex, today))) count++;
    });
    meta.textContent = `Today · ${count} / ${habits.length}`;
  }

  function scrollToToday(smooth = false) {
    const styles = getComputedStyle(document.documentElement);
    const cell = parseFloat(styles.getPropertyValue("--cell")) || 46;
    const labelWidth = parseFloat(styles.getPropertyValue("--label-w")) || 86;

    // Put today slightly right of center so recent history is immediately visible.
    const visibleWidth = scroller.clientWidth;
    const target =
      labelWidth +
      todayIndex * cell -
      Math.max(cell * 3.5, visibleWidth * 0.58);

    scroller.scrollTo({
      left: Math.max(0, target),
      behavior: smooth ? "smooth" : "auto"
    });
  }

  todayButton.addEventListener("click", () => scrollToToday(true));

  window.addEventListener("resize", () => {
    // Preserve the user's manual scroll position on resize rather than snapping.
  });

  updateMeta();
  requestAnimationFrame(() => scrollToToday(false));
})();
