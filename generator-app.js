// ================================
// RANDOM NAMES GENERATOR
// ================================

const FIRST_NAMES = [
  "Maria", "João", "Ana", "Carlos", "Francisca", "Antonio", "Paula", "José",
  "Juliana", "Ricardo", "Marcia", "Fernando", "Sandra", "Luiz", "Beatriz",
  "Paulo", "Camila", "Marcos", "Daniela", "Rafael", "Fernanda", "Miguel",
  "Adriana", "Felipe", "Brenda", "Gustavo", "Cristina", "Bruno", "Viviane",
  "Alexandre", "Patricia", "Lucas", "Monique", "Diego", "Alessandra", "Gabriel",
  "Larissa", "Benilson", "Marina", "Igor", "Tatiana", "Matheus", "Vanessa"
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Ferreira", "Rodrigues",
  "Martins", "Gomes", "Alves", "Carvalho", "Ribeiro", "Pereira", "Teixeira",
  "Rocha", "Monteiro", "Barbosa", "Perez", "Leite", "Medeiros", "Cavalcanti",
  "Moreira", "Pinto", "Vieira", "Machado", "Neves", "Fonseca", "Camara",
  "Guerreiro", "Duarte", "Batista", "Campos", "Nogueira", "Siqueira", "Mendes",
  "Passos", "Correia", "Brito", "Tavares", "Araujo"
];

function generateRandomName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// ================================
// UI ELEMENTS
// ================================

const UI = {
  uploadArea: document.getElementById("upload-area"),
  fileInput: document.getElementById("pdf-input"),
  fileInfo: document.getElementById("file-info"),
  fileName: document.getElementById("file-name"),
  removeFileBtn: document.getElementById("remove-file-btn"),
  
  quantityInput: document.getElementById("quantity-input"),
  guideStartInput: document.getElementById("guide-start-input"),
  randomNamesToggle: document.getElementById("random-names-toggle"),
  defaultNameInput: document.getElementById("default-name-input"),
  defaultNameGroup: document.getElementById("default-name-group"),
  
  generateBtn: document.getElementById("generate-btn"),
  
  progressSection: document.getElementById("progress-section"),
  progressBar: document.getElementById("progress-bar"),
  progressText: document.getElementById("progress-text"),
  progressDetail: document.getElementById("progress-detail"),
  
  resultsSection: document.getElementById("results-section"),
  statCount: document.getElementById("stat-count"),
  statSize: document.getElementById("stat-size"),
  downloadZipBtn: document.getElementById("download-zip-btn"),
  resetBtn: document.getElementById("reset-btn"),
};

// ================================
// STATE
// ================================

let state = {
  selectedFile: null,
  generatedFiles: [],
};

// ================================
// EVENT LISTENERS
// ================================

// File upload
UI.fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file && file.type === "application/pdf") {
    selectFile(file);
  }
});

// Drag and drop
UI.uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  UI.uploadArea.classList.add("drag-active");
});

UI.uploadArea.addEventListener("dragleave", () => {
  UI.uploadArea.classList.remove("drag-active");
});

UI.uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  UI.uploadArea.classList.remove("drag-active");
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type === "application/pdf") {
    selectFile(file);
  }
});

// Remove file
UI.removeFileBtn.addEventListener("click", () => {
  removeFile();
});

// Random names toggle
UI.randomNamesToggle.addEventListener("change", (e) => {
  UI.defaultNameGroup.style.display = e.target.checked ? "none" : "grid";
});

// Generate
UI.generateBtn.addEventListener("click", () => {
  generateGuides();
});

// Download ZIP
UI.downloadZipBtn.addEventListener("click", () => {
  downloadAsZip();
});

// Reset
UI.resetBtn.addEventListener("click", () => {
  reset();
});

// ================================
// FILE SELECTION
// ================================

function selectFile(file) {
  state.selectedFile = file;
  UI.fileName.textContent = file.name;
  UI.fileInfo.classList.remove("hidden");
  UI.uploadArea.style.display = "none";
  UI.generateBtn.disabled = false;
}

function removeFile() {
  state.selectedFile = null;
  UI.fileInput.value = "";
  UI.fileInfo.classList.add("hidden");
  UI.uploadArea.style.display = "block";
  UI.generateBtn.disabled = true;
}

// ================================
// GUIDE GENERATION
// ================================

async function generateGuides() {
  if (!state.selectedFile) {
    alert("Por favor, selecione um arquivo PDF");
    return;
  }

  const quantity = parseInt(UI.quantityInput.value) || 5;
  const startGuide = parseInt(UI.guideStartInput.value) || 100001;
  const useRandomNames = UI.randomNamesToggle.checked;
  const defaultName = UI.defaultNameInput.value || "Paciente";

  state.generatedFiles = [];

  // Show progress
  UI.progressSection.classList.remove("hidden");
  updateProgress(0, quantity);

  try {
    const fileBuffer = await state.selectedFile.arrayBuffer();

    for (let i = 0; i < quantity; i++) {
      const guideNumber = startGuide + i;
      const patientName = useRandomNames ? generateRandomName() : defaultName;
      const fileName = `${patientName}_${guideNumber}.pdf`;

      // Copiar arquivo original (simulated modification)
      const newBuffer = fileBuffer.slice(0);
      state.generatedFiles.push({
        name: fileName,
        data: new Blob([newBuffer], { type: "application/pdf" }),
        size: fileBuffer.byteLength,
      });

      updateProgress(i + 1, quantity);

      // Small delay to prevent blocking
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    showResults(quantity);
  } catch (error) {
    console.error("Erro ao gerar guias:", error);
    alert("Erro ao gerar guias: " + error.message);
    UI.progressSection.classList.add("hidden");
  }
}

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  UI.progressBar.style.width = `${percentage}%`;
  UI.progressText.textContent = `${current} / ${total}`;
  UI.progressDetail.textContent = `${current} guia${current !== 1 ? "s" : ""} processada${current !== 1 ? "s" : ""}...`;
}

// ================================
// RESULTS
// ================================

function showResults(count) {
  UI.progressSection.classList.add("hidden");
  UI.resultsSection.classList.remove("hidden");

  const totalSize = state.generatedFiles.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  UI.statCount.textContent = count;
  UI.statSize.textContent = `${totalSizeMB} MB`;
}

// ================================
// ZIP DOWNLOAD
// ================================

async function downloadAsZip() {
  if (state.generatedFiles.length === 0) {
    alert("Nenhum arquivo para download");
    return;
  }

  UI.downloadZipBtn.disabled = true;
  UI.downloadZipBtn.textContent = "⏳ Compactando...";

  try {
    const zip = new JSZip();

    for (const file of state.generatedFiles) {
      zip.file(file.name, file.data);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guias_medicas_${new Date().getTime()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao criar ZIP:", error);
    alert("Erro ao criar arquivo ZIP: " + error.message);
  } finally {
    UI.downloadZipBtn.disabled = false;
    UI.downloadZipBtn.textContent = "📦 Baixar Todas em ZIP";
  }
}

// ================================
// RESET
// ================================

function reset() {
  removeFile();
  state.generatedFiles = [];
  UI.progressSection.classList.add("hidden");
  UI.resultsSection.classList.add("hidden");
  UI.quantityInput.value = 5;
  UI.guideStartInput.value = 100001;
  UI.randomNamesToggle.checked = true;
  UI.defaultNameInput.value = "";
  UI.defaultNameGroup.style.display = "none";
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener("DOMContentLoaded", () => {
  // Make upload area clickable
  UI.uploadArea.addEventListener("click", () => {
    UI.fileInput.click();
  });

  console.log("Gerador de Guias Médicas inicializado");
});
