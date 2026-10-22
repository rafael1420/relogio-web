// script.js
// UTC não é um lugar, então fica sem coordenadas (e sem clima)
const zones = [
  { tz: "America/Sao_Paulo", city: "Brasília", lat: -15.79, lon: -47.88 },
  { tz: "UTC", city: "UTC" },
  { tz: "America/New_York", city: "Nova York", lat: 40.71, lon: -74.01 },
  { tz: "Europe/London", city: "Londres", lat: 51.51, lon: -0.13 },
  { tz: "Europe/Dublin", city: "Dublin", lat: 53.35, lon: -6.26 },
  { tz: "Europe/Moscow", city: "Moscou", lat: 55.76, lon: 37.62 },
  { tz: "Asia/Tokyo", city: "Tóquio", lat: 35.68, lon: 139.69 },
  { tz: "Australia/Sydney", city: "Sydney", lat: -33.87, lon: 151.21 },
];

const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("city-name");
const cityOffsetElement = document.getElementById("city-offset");
const localZoneElement = document.getElementById("local-zone");
const zoneList = document.getElementById("zone-list");
const weatherElement = document.getElementById("weather");
const weatherIcon = document.getElementById("weather-icon");
const weatherTemp = document.getElementById("weather-temp");
const weatherDesc = document.getElementById("weather-desc");
const weatherExtra = document.getElementById("weather-extra");
const announcer = document.getElementById("announcer");
const speakButton = document.getElementById("speak");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings");
const themeMeta = document.querySelector('meta[name="theme-color"]');
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
      <span class="zone-temp"></span>
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
  if (tz === selected) return;
  selected = tz;
  saveSelected(tz);
  updateClock();
  renderWeather();
  announcer.textContent = describeNow();
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

/* ---------- Clima (Open-Meteo, sem chave) ---------- */

const WEATHER_REFRESH = 15 * 60 * 1000;
let weather = {}; // tz -> { temp, feels, humidity, wind, code, isDay }
let weatherFailed = false;

// Códigos WMO usados pela Open-Meteo
const WEATHER_CODES = {
  0: ["céu limpo", "clear"],
  1: ["predominantemente limpo", "clear"],
  2: ["parcialmente nublado", "partly"],
  3: ["nublado", "cloud"],
  45: ["neblina", "fog"],
  48: ["neblina com geada", "fog"],
  51: ["garoa fraca", "rain"],
  53: ["garoa", "rain"],
  55: ["garoa forte", "rain"],
  56: ["garoa congelante", "rain"],
  57: ["garoa congelante forte", "rain"],
  61: ["chuva fraca", "rain"],
  63: ["chuva", "rain"],
  65: ["chuva forte", "rain"],
  66: ["chuva congelante", "rain"],
  67: ["chuva congelante forte", "rain"],
  71: ["neve fraca", "snow"],
  73: ["neve", "snow"],
  75: ["neve forte", "snow"],
  77: ["grãos de neve", "snow"],
  80: ["pancadas de chuva", "rain"],
  81: ["pancadas de chuva fortes", "rain"],
  82: ["pancadas de chuva violentas", "rain"],
  85: ["pancadas de neve", "snow"],
  86: ["pancadas de neve fortes", "snow"],
  95: ["trovoada", "storm"],
  96: ["trovoada com granizo", "storm"],
  99: ["trovoada com granizo forte", "storm"],
};

// Ícones de traço fino, no mesmo espírito do mostrador
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  partly: '<path d="M8 3.5v1.2M3.5 8h1.2M4.8 4.8l.9.9M11.2 4.8l-.9.9"/><path d="M5.4 10.4A3 3 0 1 1 10.8 7"/><path d="M8 20h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-.4A3.7 3.7 0 0 0 8 20z"/>',
  cloud: '<path d="M7 19h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.5-.5A4.3 4.3 0 0 0 7 19z"/>',
  fog: '<path d="M7 14h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 6.6 3.7 3.7 0 0 0 7 14z"/><path d="M4 17.5h16M6 21h12"/>',
  rain: '<path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 7.6 3.7 3.7 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  snow: '<path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 7.6 3.7 3.7 0 0 0 7 15z"/><path d="M8 19h.01M12 18.5h.01M16 19h.01M10 21.5h.01M14 21.5h.01" stroke-width="2.4"/>',
  storm: '<path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 7.6 3.7 3.7 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
};

function weatherInfo(data) {
  const [label, kind] = WEATHER_CODES[data.code] || ["tempo indefinido", "cloud"];
  let icon = kind;
  if (kind === "clear") icon = data.isDay ? "sun" : "moon";
  if (kind === "partly" && !data.isDay) icon = "cloud";
  return { label, svg: `<svg viewBox="0 0 24 24">${ICONS[icon]}</svg>` };
}

async function fetchWeather() {
  const places = zones.filter((z) => z.lat !== undefined);
  const params = new URLSearchParams({
    latitude: places.map((z) => z.lat).join(","),
    longitude: places.map((z) => z.lon).join(","),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
    timezone: "auto",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    // Com várias coordenadas a API devolve uma lista, com uma só devolve um objeto
    const results = Array.isArray(body) ? body : [body];
    places.forEach((zone, i) => {
      const c = results[i] && results[i].current;
      if (!c) return;
      weather[zone.tz] = {
        temp: Math.round(c.temperature_2m),
        feels: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m),
        wind: Math.round(c.wind_speed_10m),
        code: c.weather_code,
        isDay: c.is_day === 1,
      };
    });
    weatherFailed = false;
  } catch (e) {
    weatherFailed = true;
  }
  renderWeather();
}

function renderWeather() {
  const zone = zones.find((z) => z.tz === selected);
  const data = weather[zone.tz];

  if (zone.lat === undefined) {
    weatherElement.hidden = true;
  } else {
    weatherElement.hidden = false;
    if (data) {
      const info = weatherInfo(data);
      weatherElement.dataset.state = "ok";
      weatherIcon.innerHTML = info.svg;
      weatherTemp.innerHTML = `<span aria-hidden="true">${data.temp}°</span><span class="sr-only">${data.temp} graus</span>`;
      weatherDesc.textContent = info.label;
      weatherExtra.textContent = `sensação ${data.feels}° · umidade ${data.humidity}% · vento ${data.wind} km/h`;
    } else {
      weatherElement.dataset.state = weatherFailed ? "error" : "loading";
      weatherIcon.innerHTML = "";
      weatherTemp.textContent = "—";
      weatherDesc.textContent = weatherFailed ? "Clima indisponível agora" : "Carregando o clima…";
      weatherExtra.textContent = weatherFailed ? "Tentaremos de novo em alguns minutos." : "";
    }
  }

  zoneList.querySelectorAll(".zone").forEach((button) => {
    const d = weather[button.dataset.tz];
    const cell = button.querySelector(".zone-temp");
    if (!d) {
      cell.innerHTML = "";
      return;
    }
    const info = weatherInfo(d);
    cell.innerHTML = `${info.svg.replace("<svg", '<svg aria-hidden="true"')}<span aria-hidden="true">${d.temp}°</span><span class="sr-only">, ${d.temp} graus, ${info.label}</span>`;
  });
}

// Frase completa usada pelo leitor de tela e pelo botão de ouvir
function describeNow() {
  const zone = zones.find((z) => z.tz === selected);
  const { h, m } = partsIn(zone.tz, new Date());
  let text = `${zone.city}: ${h} hora${h === 1 ? "" : "s"} e ${m} minuto${m === 1 ? "" : "s"}.`;
  const d = weather[zone.tz];
  if (d) text += ` ${d.temp} graus, ${weatherInfo(d).label}.`;
  return text;
}

function setupSpeech() {
  if (!("speechSynthesis" in window)) return;
  speakButton.hidden = false;
  speakButton.addEventListener("click", () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(describeNow());
    utterance.lang = "pt-BR";
    speechSynthesis.speak(utterance);
  });
}

/* ---------- Ajustes: tema, texto e alto contraste ---------- */

const THEME_COLORS = { noite: "#12100d", papel: "#f3ede2", oceano: "#0b1420" };
const lightQuery = window.matchMedia("(prefers-color-scheme: light)");
let settings = loadSettings();

function loadSettings() {
  const defaults = { theme: "auto", text: "normal", contrast: false };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("ajustes") || "{}") };
  } catch (e) {
    return defaults;
  }
}

function applySettings() {
  const root = document.documentElement;
  const theme = settings.theme === "auto" ? (lightQuery.matches ? "papel" : "noite") : settings.theme;
  root.dataset.theme = theme;
  root.dataset.text = settings.text;
  if (settings.contrast) root.dataset.contrast = "alto";
  else delete root.dataset.contrast;
  themeMeta.setAttribute("content", settings.contrast ? "#000000" : THEME_COLORS[theme]);
}

function setupSettings() {
  settingsPanel.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
  settingsPanel.querySelector(`input[name="text"][value="${settings.text}"]`).checked = true;
  settingsPanel.querySelector('input[name="contrast"]').checked = settings.contrast;

  settingsPanel.addEventListener("change", (event) => {
    const input = event.target;
    settings[input.name] = input.type === "checkbox" ? input.checked : input.value;
    try {
      localStorage.setItem("ajustes", JSON.stringify(settings));
    } catch (e) {
      // ignora
    }
    applySettings();
  });

  settingsToggle.addEventListener("click", () => {
    const open = settingsToggle.getAttribute("aria-expanded") !== "true";
    settingsToggle.setAttribute("aria-expanded", String(open));
    settingsPanel.hidden = !open;
    if (open) settingsPanel.querySelector("input:checked, input").focus();
  });

  // Esc fecha o painel e devolve o foco ao botão
  settingsPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    settingsToggle.click();
    settingsToggle.focus();
  });

  lightQuery.addEventListener("change", applySettings);
  applySettings();
}

setupSettings();
buildTicks();
buildList();
showLocalZone();
updateClock();
renderWeather();
setupSpeech();
fetchWeather();
setInterval(fetchWeather, WEATHER_REFRESH);

// Sincroniza com a virada do segundo para não "pular" números
setTimeout(() => {
  updateClock();
  setInterval(updateClock, 1000);
}, 1000 - (Date.now() % 1000));
