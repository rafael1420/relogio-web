// script.js
const timeElement = document.getElementById("time");
const timezoneSelector = document.getElementById("timezone");

// Atualiza o relógio
function updateClock() {
  const selectedTimezone = timezoneSelector.value;
  const now = new Date();

  // Converte o tempo para o fuso horário selecionado
  const options = {
    timeZone: selectedTimezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  
  const formattedTime = new Intl.DateTimeFormat("en-US", options).format(now);
  timeElement.textContent = formattedTime;
}

// Atualiza a cada segundo
setInterval(updateClock, 1000);

// Adiciona um evento para mudar o fuso horário
timezoneSelector.addEventListener("change", updateClock);

// Inicializa o relógio
updateClock();
