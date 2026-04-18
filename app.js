// Wait for PDF.js to be ready before initializing the app
function waitForPdfJs(callback, maxAttempts = 100) {
  if (typeof pdfjsLib !== "undefined" && pdfjsLib.getDocument) {
    callback();
  } else if (maxAttempts > 0) {
    setTimeout(() => waitForPdfJs(callback, maxAttempts - 1), 100);
  } else {
    console.error(
      "PDF.js failed to load after 10 seconds. Check your internet connection."
    );
    alert(
      "Erro ao carregar PDF.js. Verifique sua conexão com a internet, limpe o cache do navegador e recarregue a página."
    );
  }
}

const UI_ELEMENTS = {
  input: document.getElementById("pdf-input"),
  processButton: document.getElementById("process-button"),
  output: document.getElementById("output"),
  progressContainer: document.getElementById("progress-container"),
  progressBar: document.getElementById("progress-bar"),
  progressText: document.getElementById("progress-text"),
};

const PATTERNS = {
  patient: [
    /Nome do Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do Titular\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome\s+do\s+Beneficiário\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /10 - Nome\s*(.+?)\s*11 -/gi,  // Novo padrão para guias TISS
    /código 10 - Nome\s*(.+?)\s*(?:\r?\n|$)/gi,  // Padrão específico com "código"
  ],

  guide: [
    /Número da Guia no Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número Guia Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia principal\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /N[ºo]\s*Guia Operadora\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia TISS\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia\s*(?:N(?:º|o|º?)|#)?\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da Guia Principal\s*(\d+)/gi,  // Corrigido: guia principal
    /Número da Guia Atribuido pela Operadora\s*(\d+)/gi,  // Corrigido: guia atribuída
    /código 7 - Número da Guia Atribuido pela Operadora\s*(\d+)/gi,  // Padrão específico com "código"
  ],
};

class PdfTextExtractor {
  async extract(file) {
    const buffer = await file.arrayBuffer();
    const mimeType = file.type || "application/pdf";

    if (mimeType.startsWith("image/")) {
      const text = await this.ocrImage(file);
      return {
        text: this.normalize(text),
        buffer,
        mimeType,
      };
    }

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    }).promise;

    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, index) =>
        pdf.getPage(index + 1).then(page => page.getTextContent())
      )
    );

    const text = pages
      .map(page =>
        page.items
          .map(item => item.str.trim())
          .filter(Boolean)
          .join("\n")
      )
      .join("\n");

    const normalized = this.normalize(text);

    if (!this.isValidText(normalized)) {
      const ocrText = await this.ocrPdf(pdf);
      return {
        text: this.normalize(ocrText),
        buffer,
        mimeType,
      };
    }

    return {
      text: normalized,
      buffer,
      mimeType,
    };
  }

  normalize(text) {
    return text
      .replace(/\s{2,}/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim();
  }

  isValidText(text) {
    return text && text.trim().length >= 40;
  }

  async ocrPdf(pdf) {
    const worker = await Tesseract.createWorker("por");
    const pagesText = [];

    try {
      for (let pageIndex = 1; pageIndex <= Math.min(pdf.numPages, 2); pageIndex++) {
        const page = await pdf.getPage(pageIndex);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");

        await page.render({ canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        pagesText.push(result.data.text || "");
      }
    } finally {
      await worker.terminate();
    }

    return pagesText.join("\n");
  }

  async ocrImage(file) {
    const worker = await Tesseract.createWorker("por");

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);

      const result = await worker.recognize(canvas);
      return result.data.text || "";
    } finally {
      await worker.terminate();
    }
  }
}

class PatientDataExtractor {
  constructor(patterns) {
    this.patterns = patterns;
  }

  extract(text) {
    return {
      patient:
        this.find(text, this.patterns.patient) ||
        this.findByLabel(text, "Nome do Beneficiário") ||
        this.findByLabel(text, "Paciente"),

      guide:
        this.find(text, this.patterns.guide) ||
        this.findByLabel(text, "Número da Guia no Prestador") ||
        this.findByLabel(text, "Número da guia"),
    };
  }

  find(text, patterns) {
    for (const regex of patterns) {
      const match = regex.exec(text);
      regex.lastIndex = 0;

      if (match?.[1]) {
        const result = match[1].trim();
        // Para guias, filtrar apenas números com pelo menos 6 dígitos
        if (patterns === this.patterns.guide && result.length < 6) {
          continue;
        }
        return result;
      }
    }

    return "";
  }

  findByLabel(text, label) {
    const lines = text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const index = lines.findIndex(line =>
      line.toLowerCase().includes(label.toLowerCase())
    );

    if (index >= 0 && lines[index + 1]) {
      return lines[index + 1].trim();
    }

    return "";
  }
}

class FilenameGenerator {
  static INVALID_CHARS = /[<>:"/\\|?*]/g;

  generate(originalName, patient, guide) {
    const safePatient = this.sanitize(
      patient || this.removeExtension(originalName)
    );

    const safeGuide = this.sanitize(
      guide || "guia"
    );

    return `${safePatient}_${safeGuide}${this.extension(originalName)}`;
  }

  sanitize(value) {
    return value
      .trim()
      .replace(/\s+/g, "_")
      .replace(FilenameGenerator.INVALID_CHARS, "")
      .slice(0, 180);
  }

  extension(filename) {
    const index = filename.lastIndexOf(".");
    return index >= 0 ? filename.slice(index) : ".pdf";
  }

  removeExtension(filename) {
    const index = filename.lastIndexOf(".");
    return index >= 0 ? filename.slice(0, index) : filename;
  }
}

class UIRenderer {
  constructor(elements) {
    this.ui = elements;
  }

  reset() {
    this.ui.output.innerHTML = "";
  }

  setLoading(isLoading) {
    this.ui.processButton.disabled = isLoading;
    this.ui.processButton.textContent = isLoading
      ? "Processando..."
      : "Processar PDFs";
  }

  showProgress(total) {
    this.ui.progressContainer.classList.remove("hidden");
    this.updateProgress(0, total);
  }

  updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    this.ui.progressBar.style.width = `${percentage}%`;
    this.ui.progressText.textContent = `${current} / ${total}`;
  }

  hideProgress() {
    setTimeout(() => {
      this.ui.progressContainer.classList.add("hidden");
    }, 600);
  }

  renderResult(fileName, patient, guide, file, generatedName) {
    const card = this.createCard(fileName);

    card.appendChild(this.createText(
      `Nome: ${patient || "(não encontrado)"} | Guia: ${guide || "(não encontrado)"}`
    ));

    card.appendChild(this.createDownloadLink(file, generatedName));

    this.ui.output.appendChild(card);
  }

  renderError(fileName, message) {
    const card = this.createCard(fileName);
    card.appendChild(this.createText(message, "error"));
    this.ui.output.appendChild(card);
  }

  createCard(title) {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h2");
    heading.textContent = title;

    card.appendChild(heading);

    return card;
  }

  createText(text, className = "") {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    if (className) {
      paragraph.className = className;
    }

    return paragraph;
  }

  createDownloadLink(file, fileName) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.className = "download-link";
    link.textContent = `Baixar ${fileName}`;

    return link;
  }
}

class PdfProcessorController {
  constructor({ uiRenderer, textExtractor, dataExtractor, filenameGenerator }) {
    this.ui = uiRenderer;
    this.textExtractor = textExtractor;
    this.dataExtractor = dataExtractor;
    this.filenameGenerator = filenameGenerator;
  }

  async process(files) {
    this.ui.reset();
    this.ui.setLoading(true);
    this.ui.showProgress(files.length);

    for (let i = 0; i < files.length; i++) {
      await this.processFile(files[i]);
      this.ui.updateProgress(i + 1, files.length);
    }

    this.ui.hideProgress();
    this.ui.setLoading(false);
  }

  async processFile(file) {
    try {
      const { text } = await this.textExtractor.extract(file);
      const { patient, guide } = this.dataExtractor.extract(text);

      if (!patient && !guide) {
        this.ui.renderError(
          file.name,
          "Não foi possível extrair o nome do paciente ou número da guia."
        );
        return;
      }

      const generatedName = this.filenameGenerator.generate(
        file.name,
        patient,
        guide
      );

      this.ui.renderResult(
        file.name,
        patient,
        guide,
        file,
        generatedName
      );
    } catch (error) {
      this.ui.renderError(
        file.name,
        `Erro ao processar: ${error.message}`
      );
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  waitForPdfJs(() => {
    if (window.pdfjsLib?.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    }

    const uiRenderer = new UIRenderer(UI_ELEMENTS);

    const controller = new PdfProcessorController({
      uiRenderer,
      textExtractor: new PdfTextExtractor(),
      dataExtractor: new PatientDataExtractor(PATTERNS),
      filenameGenerator: new FilenameGenerator(),
    });

    UI_ELEMENTS.input.addEventListener("change", () => {
      UI_ELEMENTS.processButton.disabled =
        UI_ELEMENTS.input.files.length === 0;
    });

    UI_ELEMENTS.processButton.addEventListener("click", () => {
      controller.process(Array.from(UI_ELEMENTS.input.files));
    });
  });
});