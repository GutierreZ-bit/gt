// ================================
// UI ELEMENTS
// ================================

const UI = {
  startNumber: document.getElementById("start-number"),
  endNumber: document.getElementById("end-number"),
  prefixInput: document.getElementById("prefix-input"),
  suffixInput: document.getElementById("suffix-input"),
  paddingInput: document.getElementById("padding-input"),

  previewBtn: document.getElementById("preview-btn"),
  downloadCsvBtn: document.getElementById("download-csv-btn"),
  downloadTxtBtn: document.getElementById("download-txt-btn"),
  copyBtn: document.getElementById("copy-btn"),

  previewSection: document.querySelector(".preview-section"),
  previewList: document.getElementById("preview-list"),
  statsSection: document.getElementById("stats-section"),
  statCount: document.getElementById("stat-count"),
  statFormat: document.getElementById("stat-format"),
  infoMessage: document.getElementById("info-message"),
};

// ================================
// STATE
// ================================

let state = {
  numbers: [],
  maxNumbers: 1000,
};

// ================================
// EVENT LISTENERS
// ================================

UI.previewBtn.addEventListener("click", () => {
  generatePreview();
});

UI.downloadCsvBtn.addEventListener("click", () => {
  downloadCSV();
});

UI.downloadTxtBtn.addEventListener("click", () => {
  downloadTXT();
});

UI.copyBtn.addEventListener("click", () => {
  copyToClipboard();
});

// Real-time validation
[UI.startNumber, UI.endNumber, UI.paddingInput].forEach((input) => {
  input.addEventListener("change", () => {
    validateInputs();
  });
});

// ================================
// VALIDATION
// ================================

function validateInputs() {
  const start = parseInt(UI.startNumber.value) || 0;
  const end = parseInt(UI.endNumber.value) || 0;
  const count = Math.abs(end - start) + 1;

  if (count > state.maxNumbers) {
    showMessage(
      `Máximo ${state.maxNumbers} números permitidos. Você selecionou ${count}.`,
      "error"
    );
    UI.previewBtn.disabled = true;
    return false;
  }

  UI.previewBtn.disabled = false;
  clearMessage();
  return true;
}

// ================================
// GENERATION
// ================================

function generateNumbers() {
  const start = parseInt(UI.startNumber.value) || 1;
  const end = parseInt(UI.endNumber.value) || 1;
  const prefix = UI.prefixInput.value.trim();
  const suffix = UI.suffixInput.value.trim();
  const padding = parseInt(UI.paddingInput.value) || 0;

  if (!validateInputs()) {
    return [];
  }

  const numbers = [];
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  for (let i = min; i <= max; i++) {
    const paddedNumber = String(i).padStart(padding, "0");
    const formatted = `${prefix}${paddedNumber}${suffix}`;
    numbers.push(formatted);
  }

  return numbers;
}

// ================================
// PREVIEW
// ================================

function generatePreview() {
  if (!validateInputs()) {
    return;
  }

  state.numbers = generateNumbers();

  if (state.numbers.length === 0) {
    showMessage("Nenhum número gerado", "error");
    return;
  }

  // Clear preview
  UI.previewList.innerHTML = "";

  // Show first 20 items
  const displayCount = Math.min(20, state.numbers.length);
  for (let i = 0; i < displayCount; i++) {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.textContent = state.numbers[i];
    UI.previewList.appendChild(item);
  }

  // Add "more" indicator if needed
  if (state.numbers.length > 20) {
    const moreItem = document.createElement("div");
    moreItem.className = "preview-item";
    moreItem.textContent = `+${state.numbers.length - 20} mais`;
    moreItem.style.background = "rgba(37, 99, 235, 0.2)";
    UI.previewList.appendChild(moreItem);
  }

  // Update stats
  updateStats();

  // Enable download buttons
  UI.downloadCsvBtn.disabled = false;
  UI.downloadTxtBtn.disabled = false;
  UI.copyBtn.disabled = false;

  // Show message
  showMessage(
    `✅ ${state.numbers.length} número${state.numbers.length !== 1 ? "s" : ""} gerado${state.numbers.length !== 1 ? "s" : ""} com sucesso!`,
    "success"
  );
}

// ================================
// STATS
// ================================

function updateStats() {
  if (state.numbers.length === 0) return;

  UI.statCount.textContent = state.numbers.length;
  UI.statFormat.textContent = state.numbers[0].length;
  UI.statsSection.classList.remove("hidden");
}

// ================================
// DOWNLOAD
// ================================

function downloadCSV() {
  if (state.numbers.length === 0) return;

  const csv = state.numbers.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "guias.csv");
}

function downloadTXT() {
  if (state.numbers.length === 0) return;

  const txt = state.numbers.join("\n");
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
  downloadBlob(blob, "guias.txt");
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ================================
// COPY TO CLIPBOARD
// ================================

function copyToClipboard() {
  if (state.numbers.length === 0) return;

  const text = state.numbers.join("\n");
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showMessage(
        `✅ ${state.numbers.length} número${state.numbers.length !== 1 ? "s" : ""} copiado${state.numbers.length !== 1 ? "s" : ""} para a área de transferência!`,
        "success"
      );
    })
    .catch((err) => {
      showMessage("❌ Erro ao copiar para área de transferência", "error");
      console.error(err);
    });
}

// ================================
// MESSAGES
// ================================

function showMessage(text, type = "success") {
  UI.infoMessage.textContent = text;
  UI.infoMessage.className = `info-message show ${type}`;

  if (type === "success") {
    setTimeout(() => {
      clearMessage();
    }, 5000);
  }
}

function clearMessage() {
  UI.infoMessage.classList.remove("show");
  UI.infoMessage.textContent = "";
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener("DOMContentLoaded", () => {
  validateInputs();
  console.log("Gerador de Números de Guia inicializado");
});
