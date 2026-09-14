(() => {
  const grid = document.getElementById("grid");
  const months = document.getElementById("months");
  const scroller = document.getElementById("scroller");
  const meta = document.getElementById("meta");
  const live = document.getElementById("live");
  const todayButton = document.getElementById("todayButton");

  const habits = [
    ["Move", "#FF3800"],
    ["Cook", "#EFAE05"],
    ["Read", "#4FC1F0"],
    ["Write", "#E23AB0"],
    ["Stretch", "#A539A7"],
    ["Outside", "#76FB6F"],
    ["Practice", "#FFFC58"],
    ["Sleep", "#E9CCE8"]
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

  document.documentElement.style.setProperty("--rows", String(habits.length));
  grid.style.gridTemplateColumns = `var(--label-w) repeat(${dates.length}, var(--cell))`;
  grid.style.gridTemplateRows = `calc(var(--head-h) - var(--month-h)) repeat(${habits.length}, var(--cell))`;

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

  // One band per month, as wide as that month's columns. The label inside is
  // sticky, so it holds at the left edge and is pushed out by the next month.
  let bandMonth = null;
  let band = null;
  dates.forEach((date) => {
    const stamp = `${date.getFullYear()}-${date.getMonth()}`;
    if (stamp !== bandMonth) {
      bandMonth = stamp;
      band = document.createElement("div");
      band.className = "month-band";
      band.dataset.days = "0";
      band.innerHTML = `<span>${monthNames[date.getMonth()]}</span>`;
      months.appendChild(band);
    }
    const days = Number(band.dataset.days) + 1;
    band.dataset.days = String(days);
    band.style.width = `calc(var(--cell) * ${days})`;
  });

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

      const cell = document.createElement("label");
      cell.className =
        "cell" +
        (completed ? " done" : "") +
        (column === todayIndex ? " today-cell" : "") +
        (future ? " future" : "") +
        (monthStart ? " month-start" : "");

      cell.style.setProperty("--habit", habitColor);

      // A real checkbox, not a button: Safari gives `switch` inputs their own
      // Taptic tick, and tapping the input is the only way to reach it.
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.className = "cell-check";
      input.checked = completed;
      input.disabled = future;

      cell.appendChild(input);
      cell.insertAdjacentHTML("beforeend", buildFlower(faces[(habitIndex + column) % faces.length]));

      setAriaLabel(input, habitName, date, completed, future);

      input.addEventListener("change", () => {
        toggleHabit(cell, input, habitIndex, habitName, date);
      });

      grid.appendChild(cell);
    });
  });

  function setAriaLabel(input, habitName, date, completed, future = false) {
    let label = `${habitName}, ${readableDate(date)}`;
    if (completed) label += ", completed";
    if (future) label += ", future date";
    input.setAttribute("aria-label", label);
  }

  // Android exposes the Vibration API; iOS never has, and gets its tick from
  // the native switch control being toggled instead.
  function tick() {
    if (typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(12);
    } catch {
      /* no motor, or the browser refused */
    }
  }

  function toggleHabit(cell, input, habitIndex, habitName, date) {
    const storedKey = habitKey(habitIndex, date);

    // A second tap mid-bloom cancels the first one's pending state changes.
    if (cell.timers) cell.timers.forEach(clearTimeout);
    cell.timers = [];
    cell.classList.remove("animating");

    if (!input.checked) {
      state.delete(storedKey);
      cell.classList.remove("done");
      setAriaLabel(input, habitName, date, false);
      live.textContent = `${habitName} marked incomplete for ${readableDate(date)}`;
      saveState();
      updateMeta();
      return;
    }

    state.add(storedKey);
    saveState();
    tick();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cell.classList.add("done");
      setAriaLabel(input, habitName, date, true);
      live.textContent = `${habitName} completed for ${readableDate(date)}`;
      updateMeta();
      return;
    }

    cell.classList.add("animating");

    cell.timers.push(setTimeout(() => {
      cell.classList.add("done");
    }, 820));

    cell.timers.push(setTimeout(() => {
      cell.classList.remove("animating");
      setAriaLabel(input, habitName, date, true);
      live.textContent = `${habitName} completed for ${readableDate(date)}`;
      updateMeta();
    }, 1050));
  }

  function updateMeta() {
    let count = 0;
    habits.forEach((_, habitIndex) => {
      if (state.has(habitKey(habitIndex, today))) count++;
    });
    meta.textContent = `Today · ${count} / ${habits.length}`;
  }

  // Cell size is derived from viewport height in CSS, so measure it rather than
  // parsing the custom property (which resolves to an unevaluated calc()).
  function cellWidth() {
    const probe = grid.querySelector(".date");
    const width = probe ? probe.getBoundingClientRect().width : 0;
    return width || 46;
  }

  let leftColumn = 0;
  let scrollQueued = false;

  function scrollToToday(smooth = false) {
    // Today sits flush against the sticky label column: the first date you see.
    leftColumn = todayIndex;
    scroller.scrollTo({
      left: todayIndex * cellWidth(),
      behavior: smooth ? "smooth" : "auto"
    });
  }

  scroller.addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      leftColumn = Math.round(scroller.scrollLeft / cellWidth());
      scrollQueued = false;
    });
  });

  todayButton.addEventListener("click", () => scrollToToday(true));

  window.addEventListener("resize", () => {
    // Cell size changes with viewport height, so hold the same leftmost day.
    scroller.scrollTo({ left: leftColumn * cellWidth(), behavior: "auto" });
  });

  updateMeta();
  requestAnimationFrame(() => scrollToToday(false));
})();
