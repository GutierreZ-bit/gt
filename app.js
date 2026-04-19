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
  downloadAllButton: document.getElementById("download-all-button"),
  output: document.getElementById("output"),
  progressSection: document.getElementById("progress-section"),
  progressBar: document.getElementById("progress-bar"),
  progressText: document.getElementById("progress-text"),
  progressDetail: document.getElementById("progress-detail"),
  progressPercent: document.getElementById("progress-percent"),
  fileList: document.getElementById("file-list"),
  fileCount: document.getElementById("file-count"),
  fileItems: document.getElementById("file-items"),
  clearFilesBtn: document.getElementById("clear-files-btn"),
  actionMessage: document.querySelector(".action-message"),
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

/**
 * Extrai texto de arquivos PDF ou imagens usando PDF.js e OCR quando necessário
 */
class PdfTextExtractor {
  /**
   * Extrai texto de um arquivo (PDF ou imagem)
   * @param {File} file - Arquivo para extrair texto
   * @returns {Promise<{text: string, buffer: ArrayBuffer, mimeType: string}>}
   */
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

/**
 * Extrai dados do paciente (nome e número de guia) de texto
 */
class PatientDataExtractor {
  /**
   * @param {Object} patterns - Objeto com arrays de padrões regex
   * @param {RegExp[]} patterns.patient - Padrões para extrair nome
   * @param {RegExp[]} patterns.guide - Padrões para extrair guia
   */
  constructor(patterns) {
    this.patterns = patterns;
  }

  /**
   * Extrai nome do paciente e número de guia do texto
   * @param {string} text - Texto extraído do PDF/imagem
   * @returns {Object} {patient: string, guide: string}
   */
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

  /**
   * Encontra primeiro match em array de padrões regex
   * @param {string} text - Texto para buscar
   * @param {RegExp[]} patterns - Array de padrões regex
   * @returns {string} Primeiro match encontrado ou string vazia
   */
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

  /**
   * Busca por padrão formato 'Label: valor'
   * @param {string} text - Texto para buscar
   * @param {string} label - Label para procurar
   * @returns {string} Valor encontrado ou string vazia
   */
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

/**
 * Gera nomes de arquivo renomeados com base em dados do paciente
 */
class FilenameGenerator {
  static INVALID_CHARS = /[<>:"/\\|?*]/g;

  /**
   * Gera nome de arquivo renomeado
   * @param {string} originalName - Nome original do arquivo
   * @param {string} patient - Nome do paciente
   * @param {string} guide - Número da guia
   * @returns {string} Nome do arquivo renomeado
   */
  generate(originalName, patient, guide) {
    const safePatient = this.sanitize(
      patient || this.removeExtension(originalName)
    );

    const safeGuide = this.sanitize(
      guide || "guia"
    );

    return `${safePatient}_${safeGuide}${this.extension(originalName)}`;
  }

  /**
   * Remove caracteres inválidos para nomes de arquivo
   * @param {string} value - Valor para sanitizar
   * @returns {string} Valor sanitizado
   */
  sanitize(value) {
    return value
      .trim()
      .replace(/\s+/g, "_")
      .replace(FilenameGenerator.INVALID_CHARS, "")
      .slice(0, 180);
  }

  /**
   * Extrai extensão do arquivo
   * @param {string} filename - Nome do arquivo
   * @returns {string} Extensão com ponto (ex: '.pdf')
   */
  extension(filename) {
    const index = filename.lastIndexOf(".");
    return index >= 0 ? filename.slice(index) : ".pdf";
  }

  /**
   * Remove extensão do nome do arquivo
   * @param {string} filename - Nome do arquivo
   * @returns {string} Nome sem extensão
   */
  removeExtension(filename) {
    const index = filename.lastIndexOf(".");
    return index >= 0 ? filename.slice(0, index) : filename;
  }
}

/**
 * Renderiza elementos da interface do usuário e atualiza o DOM
 */
class UIRenderer {
  /**
   * @param {Object} elements - Referências aos elementos do DOM
   */
  constructor(elements) {
    this.ui = elements;
  }

  reset() {
    this.ui.output.innerHTML = "";
    this.ui.downloadAllButton.classList.add("hidden");
  }

  setLoading(isLoading) {
    this.ui.processButton.disabled = isLoading;
    this.ui.processButton.textContent = isLoading
      ? "Processando..."
      : "Processar PDFs";
  }

  showProgress(total) {
    this.ui.progressSection.classList.remove("hidden");
    this.updateProgress(0, total);
  }

  updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    this.ui.progressBar.style.width = `${percentage}%`;
    this.ui.progressText.textContent = `${current} / ${total}`;
    this.ui.progressPercent.textContent = `${percentage}%`;
  }

  hideProgress() {
    setTimeout(() => {
      this.ui.progressSection.classList.add("hidden");
    }, 600);
  }

  renderResult(fileName, patient, guide, file, generatedName) {
    const card = this.createCard();

    // Card header with file name
    const header = document.createElement("div");
    header.className = "card-header";
    const icon = document.createElement("div");
    icon.className = "card-header-icon";
    icon.textContent = "✓";
    icon.style.color = "#10b981";
    header.appendChild(icon);

    const headerText = document.createElement("div");
    headerText.className = "card-header-text";
    const title = document.createElement("h3");
    title.className = "card-title";
    title.style.fontSize = "1rem";
    title.textContent = fileName;
    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = "Arquivo processado com sucesso";
    headerText.appendChild(title);
    headerText.appendChild(subtitle);
    header.appendChild(headerText);
    card.appendChild(header);

    // Card body with details
    const body = document.createElement("div");
    body.className = "card-body";
    
    const details = document.createElement("div");
    details.style.display = "grid";
    details.style.gap = "0.75rem";
    details.style.marginBottom = "1rem";

    const patientDiv = document.createElement("div");
    patientDiv.style.padding = "0.75rem";
    patientDiv.style.background = "rgba(37, 99, 235, 0.05)";
    patientDiv.style.borderRadius = "0.5rem";
    const patientLabel = document.createElement("span");
    patientLabel.style.display = "block";
    patientLabel.style.fontSize = "0.75rem";
    patientLabel.style.color = "#64748b";
    patientLabel.style.fontWeight = "600";
    patientLabel.textContent = "Nome do Paciente";
    const patientValue = document.createElement("span");
    patientValue.style.display = "block";
    patientValue.style.fontSize = "1rem";
    patientValue.style.fontWeight = "600";
    patientValue.style.color = "#0f172a";
    patientValue.textContent = patient || "(não encontrado)";
    patientDiv.appendChild(patientLabel);
    patientDiv.appendChild(patientValue);
    details.appendChild(patientDiv);

    const guideDiv = document.createElement("div");
    guideDiv.style.padding = "0.75rem";
    guideDiv.style.background = "rgba(16, 185, 129, 0.05)";
    guideDiv.style.borderRadius = "0.5rem";
    const guideLabel = document.createElement("span");
    guideLabel.style.display = "block";
    guideLabel.style.fontSize = "0.75rem";
    guideLabel.style.color = "#64748b";
    guideLabel.style.fontWeight = "600";
    guideLabel.textContent = "Número da Guia";
    const guideValue = document.createElement("span");
    guideValue.style.display = "block";
    guideValue.style.fontSize = "1rem";
    guideValue.style.fontWeight = "600";
    guideValue.style.color = "#0f172a";
    guideValue.textContent = guide || "(não encontrado)";
    guideDiv.appendChild(guideLabel);
    guideDiv.appendChild(guideValue);
    details.appendChild(guideDiv);

    body.appendChild(details);
    body.appendChild(this.createDownloadLink(file, generatedName));
    card.appendChild(body);

    this.ui.output.appendChild(card);
  }

  renderError(fileName, message) {
    const card = this.createCard();
    
    const header = document.createElement("div");
    header.className = "card-header";
    const icon = document.createElement("div");
    icon.className = "card-header-icon";
    icon.textContent = "⚠";
    icon.style.color = "#ef4444";
    header.appendChild(icon);

    const headerText = document.createElement("div");
    headerText.className = "card-header-text";
    const title = document.createElement("h3");
    title.className = "card-title";
    title.style.fontSize = "1rem";
    title.textContent = fileName;
    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = "Erro ao processar arquivo";
    headerText.appendChild(title);
    headerText.appendChild(subtitle);
    header.appendChild(headerText);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "card-body";
    const errorMsg = document.createElement("p");
    errorMsg.className = "error-text";
    errorMsg.textContent = message;
    body.appendChild(errorMsg);
    card.appendChild(body);

    this.ui.output.appendChild(card);
  }

  createCard() {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animation = "slideInUp 600ms cubic-bezier(0.4, 0, 0.2, 1)";
    return card;
  }

  createDownloadLink(file, fileName) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(file);
    
    link.href = url;
    link.download = fileName;
    link.className = "download-link";
    link.textContent = `Baixar ${fileName}`;

    // Revoguear URL após download para evitar memory leak
    link.addEventListener('click', () => {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, { once: true });

    return link;
  }

  renderDownloadAllButton(onClick) {
    this.ui.downloadAllButton.classList.remove("hidden");
    this.ui.downloadAllButton.onclick = onClick;
  }
}

/**
 * Controlador principal que orquestra todo o processo de extração e renomeação de PDFs
 */
class PdfProcessorController {
  /**
   * @param {Object} config - Configuração com instâncias dos serviços
   * @param {UIRenderer} config.uiRenderer - Renderizador de UI
   * @param {PdfTextExtractor} config.textExtractor - Extrator de texto
   * @param {PatientDataExtractor} config.dataExtractor - Extrator de dados do paciente
   * @param {FilenameGenerator} config.filenameGenerator - Gerador de nomes de arquivo
   */
  constructor({ uiRenderer, textExtractor, dataExtractor, filenameGenerator }) {
    this.ui = uiRenderer;
    this.textExtractor = textExtractor;
    this.dataExtractor = dataExtractor;
    this.filenameGenerator = filenameGenerator;
    this.processedFiles = [];
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  }

  async process(files) {
    // Validar arquivos ANTES de iniciar processamento
    const validation = this.validateFiles(files);
    if (!validation.valid) {
      this.ui.renderError("Validação", validation.error);
      this.ui.setLoading(false);
      return;
    }

    this.processedFiles = [];
    this.ui.reset();
    this.ui.setLoading(true);
    this.ui.showProgress(files.length);

    for (let i = 0; i < files.length; i++) {
      await this.processFile(files[i]);
      this.ui.updateProgress(i + 1, files.length);
    }

    if (this.processedFiles.length > 0) {
      this.ui.renderDownloadAllButton(() => this.downloadAllAsZip());
    }

    this.ui.hideProgress();
    this.ui.setLoading(false);
  }

  validateFiles(files) {
    if (!files || files.length === 0) {
      return { valid: false, error: "Nenhum arquivo selecionado" };
    }

    for (const file of files) {
      // Validar tipo
      if (!this.isValidFileType(file)) {
        return {
          valid: false,
          error: `Tipo inválido: ${file.type}. Aceitos: PDF, PNG, JPG`
        };
      }

      // Validar tamanho
      if (file.size > this.MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        return {
          valid: false,
          error: `Arquivo muito grande: ${sizeMB}MB. Máximo: 50MB`
        };
      }
    }

    return { valid: true };
  }

  isValidFileType(file) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    return allowedTypes.includes(file.type);
  }

  async downloadAllAsZip() {
    const zip = new JSZip();

    for (const { file, generatedName } of this.processedFiles) {
      const buffer = await file.arrayBuffer();
      zip.file(generatedName, buffer);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `guias_${new Date().getTime()}.zip`;
      link.click();
    } finally {
      // Revogar URL após download para evitar memory leak
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
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

      this.processedFiles.push({ file, generatedName });
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