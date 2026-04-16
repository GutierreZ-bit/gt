const input = document.getElementById("pdf-input");
const processButton = document.getElementById("process-button");
const output = document.getElementById("output");

const PATIENT_PATTERNS = [
  /Nome do Beneficiário\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)/gi,
  /Nome do Titular\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)/gi,
  /Nome do paciente\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)/gi,
  /Paciente\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)/gi,
  /Beneficiário\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)/gi,
];

const GUIDE_PATTERNS = [
  /Guia\s*(?:N(?:º|o|º?)|#)?\s*[:\-]?\s*(\d+)/gi,
  /N[oº] da guia\s*[:\-]?\s*(\d+)/gi,
  /Número da guia\s*[:\-]?\s*(\d+)/gi,
  /Guia TISS\s*[:\-]?\s*(\d+)/gi,
];

const INVALID_FILENAME_CHARS = /[<>:\"/\\|?*]/g;

input.addEventListener("change", () => {
  processButton.disabled = input.files.length === 0;
});

processButton.addEventListener("click", async () => {
  output.innerHTML = "";
  const files = Array.from(input.files);

  if (!files.length) {
    return;
  }

  processButton.disabled = true;
  processButton.textContent = "Processando...";

  for (const file of files) {
    await processFile(file);
  }

  processButton.textContent = "Processar PDFs";
  processButton.disabled = false;
});

async function processFile(file) {
  const card = document.createElement("div");
  card.className = "card";
  const title = document.createElement("h2");
  title.textContent = file.name;
  card.appendChild(title);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const text = await extractTextFromPdf(pdf);

    const patients = findMatches(text, PATIENT_PATTERNS);
    const guides = findMatches(text, GUIDE_PATTERNS);
    const [patient, guide] = selectPair(patients, guides);

    if (!patient && !guide) {
      const error = document.createElement("p");
      error.className = "error";
      error.textContent = "Não foi possível extrair o nome do paciente ou número da guia.";
      card.appendChild(error);
      output.appendChild(card);
      return;
    }

    const safePatient = normalizeName(patient || pathWithoutExtension(file.name));
    const safeGuide = normalizeName(guide || "guia");
    const newFilename = `${safePatient}_${safeGuide}${getExtension(file.name)}`;

    const info = document.createElement("p");
    info.textContent = `Nome: ${patient || "(não encontrado)"} | Guia: ${guide || "(não encontrado)"}`;
    card.appendChild(info);

    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = newFilename;
    link.className = "download-link";
    link.textContent = `Baixar ${newFilename}`;
    card.appendChild(link);
    output.appendChild(card);
  } catch (error) {
    const err = document.createElement("p");
    err.className = "error";
    err.textContent = `Erro ao processar o arquivo: ${error.message}`;
    card.appendChild(err);
    output.appendChild(card);
  }
}

function extractTextFromPdf(pdf) {
  const pagePromises = [];
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    pagePromises.push(pdf.getPage(pageIndex).then((page) => page.getTextContent()));
  }

  return Promise.all(pagePromises).then((pages) => pages.map((page) => page.items.map((item) => item.str).join(" ")).join("\n"));
}

function findMatches(text, patterns) {
  const results = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].trim();
      if (value && !results.includes(value)) {
        results.push(value);
      }
    }
    pattern.lastIndex = 0;
  }
  return results;
}

function selectPair(patients, guides) {
  if (patients.length > 0 && guides.length > 0) {
    return [patients[0], guides[0]];
  }
  if (patients.length > 0) {
    return [patients[0], ""]; 
  }
  if (guides.length > 0) {
    return ["", guides[0]];
  }
  return ["", ""];
}

function normalizeName(value) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(INVALID_FILENAME_CHARS, "")
    .slice(0, 180);
}

function getExtension(filename) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index) : ".pdf";
}

function pathWithoutExtension(filename) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(0, index) : filename;
}

window.addEventListener("DOMContentLoaded", () => {
  if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.123/pdf.worker.min.js";
  }
});
