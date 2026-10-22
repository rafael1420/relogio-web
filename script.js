// script.js
const zones = [
  { tz: "America/Sao_Paulo", city: "Brasília" },
  { tz: "UTC", city: "UTC" },
  { tz: "America/New_York", city: "Nova York" },
  { tz: "Europe/London", city: "Londres" },
  { tz: "Europe/Moscow", city: "Moscou" },
  { tz: "Asia/Tokyo", city: "Tóquio" },
  { tz: "Australia/Sydney", city: "Sydney" },
];

const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("city-name");
const cityOffsetElement = document.getElementById("city-offset");
const localZoneElement = document.getElementById("local-zone");
const zoneList = document.getElementById("zone-list");
const hands = {
  hour: document.getElementById("hand-hour"),
  minute: document.getElementById("hand-minute"),
  second: document.getElementById("hand-second"),
};

let selected = loadSelected();

function loadSelected() {
  try {
    const saved = localStorage.getItem("fuso");
    if (zones.some((z) => z.tz === saved)) return saved;
  } catch (e) {
    // localStorage indisponível (ex.: modo privado)
  }
  return zones[0].tz;
}

function saveSelected(tz) {
  try {
    localStorage.setItem("fuso", tz);
  } catch (e) {
    // ignora
  }
}

// Retorna horas, minutos e segundos de "now" no fuso informado
function partsIn(tz, now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

// Diferença do fuso para UTC, em minutos (já considera horário de verão)
function offsetMinutes(tz, now) {
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local - utc) / 60000);
}

function formatOffset(minutes) {
  if (minutes === 0) return "GMT+0";
  const sign = minutes > 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

function formatDiff(minutes) {
  if (minutes === 0) return "mesma hora";
  const hours = minutes / 60;
  const sign = hours > 0 ? "+" : "−";
  return `${sign}${Math.abs(hours)}h`;
}

const pad = (n) => String(n).padStart(2, "0");

function buildTicks() {
  const group = document.getElementById("ticks");
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "100");
    line.setAttribute("x2", "100");
    line.setAttribute("y1", "4");
    line.setAttribute("y2", major ? "16" : "9");
    line.setAttribute("transform", `rotate(${i * 6} 100 100)`);
    line.setAttribute("class", major ? "tick major" : "tick");
    group.appendChild(line);
  }
}

function buildList() {
  zones.forEach((zone) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zone";
    button.setAttribute("role", "radio");
    button.dataset.tz = zone.tz;
    button.innerHTML = `
      <span class="zone-city">${zone.city}</span>
      <span class="zone-offset"></span>
      <span class="zone-day" aria-hidden="true"></span>
      <span class="zone-time"><span class="zone-clock"></span><span class="zone-diff"></span></span>
    `;
    button.addEventListener("click", () => select(zone.tz));
    li.appendChild(button);
    zoneList.appendChild(li);
  });

  // Navegação por setas, como um grupo de rádio
  zoneList.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const index = zones.findIndex((z) => z.tz === selected);
    const next = zones[(index + step + zones.length) % zones.length];
    select(next.tz);
    zoneList.querySelector(`[data-tz="${next.tz}"]`).focus();
  });
}

function select(tz) {
  selected = tz;
  saveSelected(tz);
  updateClock();
}

function updateClock() {
  const now = new Date();
  const zone = zones.find((z) => z.tz === selected);
  const { h, m, s } = partsIn(zone.tz, now);
  const selectedOffset = offsetMinutes(zone.tz, now);

  timeElement.innerHTML = `${pad(h)}:${pad(m)}<span class="seconds">:${pad(s)}</span>`;
  timeElement.setAttribute("aria-label", `${pad(h)}:${pad(m)} em ${zone.city}`);
  cityNameElement.textContent = zone.city;
  cityOffsetElement.textContent = formatOffset(selectedOffset);
  dateElement.textContent = new Intl.DateTimeFormat("pt-BR", {
    timeZone: zone.tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  document.title = `${pad(h)}:${pad(m)} · ${zone.city}`;

  hands.hour.setAttribute("transform", `rotate(${(h % 12) * 30 + m * 0.5} 100 100)`);
  hands.minute.setAttribute("transform", `rotate(${m * 6 + s * 0.1} 100 100)`);
  hands.second.setAttribute("transform", `rotate(${s * 6} 100 100)`);

  zoneList.querySelectorAll(".zone").forEach((button) => {
    const tz = button.dataset.tz;
    const p = partsIn(tz, now);
    const offset = offsetMinutes(tz, now);
    const isSelected = tz === selected;
    button.setAttribute("aria-checked", String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
    button.querySelector(".zone-offset").textContent = formatOffset(offset);
    button.querySelector(".zone-clock").textContent = `${pad(p.h)}:${pad(p.m)}`;
    button.querySelector(".zone-diff").textContent = isSelected ? "selecionado" : formatDiff(offset - selectedOffset);
    button.querySelector(".zone-day").style.setProperty("--pos", `${((p.h * 60 + p.m) / 1440) * 100}%`);
  });
}

function showLocalZone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  localZoneElement.textContent = `Seu fuso: ${tz.replace(/_/g, " ")}`;
}

buildTicks();
buildList();
showLocalZone();
updateClock();

// Sincroniza com a virada do segundo para não "pular" números
setTimeout(() => {
  updateClock();
  setInterval(updateClock, 1000);
}, 1000 - (Date.now() % 1000));
