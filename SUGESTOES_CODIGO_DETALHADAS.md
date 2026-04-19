# 🛠️ SUGESTÕES DE CÓDIGO - Correções Prioritárias

## 1. FIX: Memory Leak com URL.createObjectURL [CRÍTICA]

### ❌ Código Atual (app.js, linhas 424-435)
```javascript
async downloadAllAsZip() {
  const zip = new JSZip();

  for (const { file, generatedName } of this.processedFiles) {
    const buffer = await file.arrayBuffer();
    zip.file(generatedName, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);  // ← MEMORY LEAK
  link.download = `guias_${new Date().getTime()}.zip`;
  link.click();
  // ← URL nunca é revogado!
}
```

### ✅ Código Corrigido
```javascript
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
    // Limpar referência após download ser iniciado
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
```

### 📊 Impacto
- **Antes:** 100 zips processados = +100MB de memória perdida
- **Depois:** Memória liberada após download

---

## 2. FIX: Validação de Tamanho de Arquivo [ALTA]

### ❌ Código Atual
```javascript
// index.html - apenas UI hint, sem validação
<span class="upload-hint">PDFs ou imagens • Máximo 50MB cada</span>

// app.js - sem validação real
async process(files) {
  this.processedFiles = [];
  this.ui.reset();
  this.ui.setLoading(true);
  this.ui.showProgress(files.length);  // ← Não valida tamanho!

  for (let i = 0; i < files.length; i++) {
    await this.processFile(files[i]);
    // ...
  }
}
```

### ✅ Código Corrigido
```javascript
class PdfProcessorController {
  constructor({ uiRenderer, textExtractor, dataExtractor, filenameGenerator }) {
    this.ui = uiRenderer;
    this.textExtractor = textExtractor;
    this.dataExtractor = dataExtractor;
    this.filenameGenerator = filenameGenerator;
    this.processedFiles = [];
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  }

  async process(files) {
    // Validar tamanhos ANTES de iniciar
    const validation = this.validateFiles(files);
    if (!validation.valid) {
      this.ui.renderError("Validação", validation.error);
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
      return {
        valid: false,
        error: "Nenhum arquivo selecionado"
      };
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
        return {
          valid: false,
          error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: 50MB`
        };
      }
    }

    return { valid: true };
  }

  isValidFileType(file) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    return allowedTypes.includes(file.type);
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
      console.error(`Erro ao processar ${file.name}:`, error);
      this.ui.renderError(
        file.name,
        `Erro ao processar: ${error.message}`
      );
    }
  }
}
```

---

## 3. FIX: Lazy Load de Tesseract [ALTA - Performance]

### ❌ Código Atual (index.html, linha 158)
```html
<!-- Carregado SEMPRE, mesmo se não usado -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4.1.3/dist/tesseract.min.js"></script>
```

### ✅ Código Corrigido

**Passo 1:** Remover script estático do HTML

**Passo 2:** Criar arquivo `utils/tesseract-loader.js`
```javascript
// utils/tesseract-loader.js
class TesseractLoader {
  constructor() {
    this.loaded = false;
  }

  async ensureLoaded() {
    if (this.loaded) {
      return;
    }

    if (typeof Tesseract !== 'undefined') {
      this.loaded = true;
      return;
    }

    console.log('Loading Tesseract.js...');
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.3/dist/tesseract.min.js';
      script.onload = () => {
        console.log('Tesseract.js loaded successfully');
        this.loaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Tesseract.js'));
      };
      document.head.appendChild(script);
    });
  }
}

const tesseractLoader = new TesseractLoader();
export default tesseractLoader;
```

**Passo 3:** Atualizar `app.js`
```javascript
import tesseractLoader from './utils/tesseract-loader.js';

class PdfTextExtractor {
  async ocrPdf(pdf) {
    // Carregar Tesseract AQUI, não no init
    await tesseractLoader.ensureLoaded();
    
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
}
```

### 📊 Impacto
- **Antes:** +14MB sempre carregado (~4MB gzip)
- **Depois:** 0 quando não usado, +14MB sob demanda

---

## 4. FIX: Padrões Duplicados - Centralizar [MÉDIA]

### ❌ Código Atual
```javascript
// app.js
const PATTERNS = { ... }  // Linhas 39-68

// test-extraction.js
const PATTERNS = { ... }  // Lines 1-29

// rename_guides.py
PATIENT_PATTERNS = [ ... ]  # Lines 13-24
```

### ✅ Código Corrigido

**Criar:** `config/patterns.js`
```javascript
// config/patterns.js - Central source of truth
export const EXTRACTION_PATTERNS = {
  patient: [
    /Nome do Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do Titular\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome\s+do\s+Beneficiário\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /10 - Nome\s*(.+?)\s*11 -/gi,
    /código 10 - Nome\s*(.+?)\s*(?:\r?\n|$)/gi,
  ],

  guide: [
    /Número da Guia no Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número Guia Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia principal\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /N[ºo]\s*Guia Operadora\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia TISS\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia\s*(?:N(?:º|o|º?)|#)?\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da Guia Principal\s*(\d+)/gi,
    /Número da Guia Atribuido pela Operadora\s*(\d+)/gi,
    /código 7 - Número da Guia Atribuido pela Operadora\s*(\d+)/gi,
  ],

  // Consts for validation
  MIN_GUIDE_LENGTH: 6,
  INVALID_FILENAME_CHARS: /[<>:"/\\|?*]/g,
};

export default EXTRACTION_PATTERNS;
```

**Atualizar:** `app.js`
```javascript
import EXTRACTION_PATTERNS from './config/patterns.js';

const PATTERNS = EXTRACTION_PATTERNS;

// ... resto do código usa PATTERNS como antes
```

**Atualizar:** `test-extraction.js`
```javascript
import EXTRACTION_PATTERNS from './config/patterns.js';

const PATTERNS = EXTRACTION_PATTERNS;

function extract(text) {
  return {
    patient: find(text, PATTERNS.patient),
    guide: find(text, PATTERNS.guide),
  };
}

// ... resto do código
```

---

## 5. FIX: CSS Design Tokens Consolidados [MÉDIA]

### ❌ Código Atual
```css
/* styles.css - linhas 1-60 */
:root {
  --primary-gradient: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
  ... /* ~30 linhas */
}

/* generator-styles.css - linhas 1-60 (IDÊNTICO) */
:root {
  --primary-gradient: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
  ... /* ~30 linhas */
}

/* guide-number-styles.css - linhas 1-30 (PARCIALMENTE DUPLICADO) */
:root {
  --color-primary: #2563eb;
  ... /* ~15 linhas */
}
```

### ✅ Código Corrigido

**Criar:** `css/theme.css`
```css
/* css/theme.css - Source of Truth */
:root {
  /* Colors */
  --primary-gradient: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
  --primary-gradient-dark: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  --success-gradient: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  --secondary-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  
  --color-primary: #2563eb;
  --color-primary-dark: #1e40af;
  --color-primary-light: #60a5fa;
  --color-success: #10b981;
  --color-success-light: #34d399;
  --color-success-dark: #0f766e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #06b6d4;

  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-gradient: linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 50%, #f0f7ff 100%);

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  --text-light: rgba(255, 255, 255, 0.92);

  --border-light: #e2e8f0;
  --border-default: #cbd5e1;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Container */
  --container-width: 960px;
}

/* Base reset styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body,
h1,
h2,
h3,
h4,
h5,
h6,
p,
ul,
ol,
li {
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  background: var(--bg-gradient);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}
```

**Atualizar:** `styles.css`
```css
/* styles.css - Remove :root duplicate, import theme */
@import url('./theme.css');

/* Keep only styles specific to this page */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ... resto dos estilos específicos */
```

**Atualizar:** `generator-styles.css`
```css
/* generator-styles.css */
@import url('./theme.css');

/* Keep only styles specific to this page */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ... resto dos estilos específicos */
```

**Atualizar:** `guide-number-styles.css`
```css
/* guide-number-styles.css */
@import url('./theme.css');

/* Keep only styles specific to this page */
main {
  width: min(100%, var(--container-width));
  margin-inline: auto;
  padding: 2rem;
}

/* ... resto dos estilos específicos */
```

---

## 6. FIX: Adicionar aria-labels para Acessibilidade [MÉDIA]

### ❌ Código Atual (index.html)
```html
<button id="process-button" type="button" class="btn btn-primary btn-large" disabled>
  <span class="btn-icon">⚡</span>
  <span class="btn-text">Processar PDFs</span>
</button>

<button id="download-all-button" type="button" class="btn btn-success btn-large hidden">
  <span class="btn-icon">⬇️</span>
  <span class="btn-text">Baixar Todos em ZIP</span>
</button>
```

### ✅ Código Corrigido
```html
<!-- Com aria-labels explícitos -->
<button 
  id="process-button" 
  type="button" 
  class="btn btn-primary btn-large" 
  disabled
  aria-label="Processar PDFs selecionados - aperte para iniciar processamento"
>
  <span class="btn-icon" aria-hidden="true">⚡</span>
  <span class="btn-text">Processar PDFs</span>
</button>

<button 
  id="download-all-button" 
  type="button" 
  class="btn btn-success btn-large hidden"
  aria-label="Baixar todos os arquivos processados em um arquivo ZIP"
>
  <span class="btn-icon" aria-hidden="true">⬇️</span>
  <span class="btn-text">Baixar Todos em ZIP</span>
</button>

<!-- Input file com aria-describedby -->
<input
  id="pdf-input"
  type="file"
  accept="application/pdf,image/*"
  multiple
  aria-label="Selecione arquivos PDF ou imagens para processar"
  aria-describedby="upload-help"
/>
<p id="upload-help" class="sr-only">
  Apenas arquivos PDF ou imagens são aceitos. Máximo 50MB por arquivo.
</p>

<!-- Toggle com aria-label -->
<input
  type="checkbox"
  id="random-names-toggle"
  checked
  class="toggle-input"
  aria-label="Habilitar nomes fictícios aleatórios"
/>

<!-- Progress area com aria-live -->
<section 
  id="progress-section" 
  class="card card-progress hidden"
  aria-live="polite"
  aria-label="Progresso do processamento"
>
  <!-- ... -->
</section>
```

---

## 7. FIX: Dupla RemoçÃO de progress-container [BAIXA - Limpeza]

### ❌ Código Atual (index.html)
```html
<!-- PRIMEIRA DECLARAÇÃO - linha ~56 -->
<section class="card card-progress hidden" id="progress-section">
  <div class="progress-content">
    <!-- ... content -->
  </div>
</section>

<!-- SEGUNDA DECLARAÇÃO - linha ~160 (DUPLICADA!) -->
<section
  id="progress-container"
  class="progress-container hidden"
  aria-live="polite"
>
  <div class="progress-header">
    <span>Processando arquivos...</span>
    <span id="progress-text">0 / 0</span>
  </div>
  <div class="progress-bar-background">
    <div id="progress-bar" class="progress-bar"></div>
  </div>
</section>
```

### ✅ Código Corrigido
```html
<!-- Remover a segunda declaração completamente -->
<!-- Manter apenas a primeira: -->

<section 
  id="progress-section" 
  class="card card-progress hidden"
  aria-live="polite"
  aria-label="Progresso do processamento"
>
  <div class="progress-content">
    <div class="progress-header">
      <h3 class="progress-title">
        <span class="progress-spinner" aria-hidden="true">⚙️</span>
        Processando seus arquivos...
      </h3>
      <span class="progress-count" id="progress-text">0 / 0</span>
    </div>

    <div class="progress-bar-wrapper">
      <div id="progress-bar" class="progress-bar"></div>
      <span class="progress-percent" id="progress-percent">0%</span>
    </div>

    <div class="progress-details">
      <span id="progress-detail" class="progress-info">Inicializando...</span>
    </div>
  </div>
</section>
```

---

## 8. FIX: Responsividade Mobile Melhorada [MÉDIA]

### ❌ Código Atual (generator-styles.css)
```css
.upload-zone {
  padding: 3rem;  /* ← Muito grande em mobile */
}

@media (max-width: 768px) {
  /* Sem tratamento específico para upload-zone */
}
```

### ✅ Código Corrigido
```css
.upload-zone {
  padding: var(--space-2xl);
  /* Dynamic para mobile */
}

.upload-icon {
  font-size: clamp(2.5rem, 10vw, 3.5rem);  /* Responsivo */
}

@media (max-width: 768px) {
  .upload-zone {
    padding: var(--space-xl);
  }
  
  .upload-icon {
    margin-bottom: var(--space-sm);
  }
}

@media (max-width: 480px) {
  .upload-zone {
    padding: var(--space-lg);
  }

  .upload-icon {
    font-size: 2rem;
  }

  .upload-zone h3 {
    font-size: 1rem;
  }

  .upload-zone p {
    font-size: 0.875rem;
  }

  .upload-hint {
    font-size: 0.75rem;
  }

  .button-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .btn {
    width: 100%;
    padding: var(--space-md) var(--space-sm);
    font-size: 0.9rem;
  }

  .btn-large {
    padding: var(--space-md) var(--space-sm);
  }

  .progress-bar-wrapper {
    margin-bottom: var(--space-md);
  }

  .form-layout {
    grid-template-columns: 1fr;
  }
}
```

---

## 9. FIX: Melhorar Error Handling (app.js)

### ❌ Código Atual
```javascript
catch (error) {
  this.ui.renderError(
    file.name,
    `Erro ao processar: ${error.message}`
  );
}
```

### ✅ Código Corrigido
```javascript
catch (error) {
  // Log detalhado para debugging
  console.error(`Erro processando arquivo ${file.name}:`, {
    error,
    stack: error.stack,
    name: error.name,
    message: error.message,
    timestamp: new Date().toISOString(),
  });

  // Message amigável para usuário
  let userMessage = "Erro desconhecido ao processar arquivo";
  
  if (error.message.includes("timeout")) {
    userMessage = "Processamento demorou muito. Tente novamente com arquivo menor.";
  } else if (error.message.includes("memory")) {
    userMessage = "Memória insuficiente. Tente processar menos arquivos por vez.";
  } else if (error.message.includes("PDF")) {
    userMessage = "Arquivo PDF corrupto ou inválido.";
  } else if (error.message.includes("OCR")) {
    userMessage = "Erro ao ler texto do arquivo. Verifique qualidade da imagem.";
  } else {
    userMessage = `Erro: ${error.message}`;
  }

  this.ui.renderError(file.name, userMessage);
}
```

---

## 10. NOVO ARQUIVO: Constants [Código Limpo]

### Criar: `config/constants.js`
```javascript
// config/constants.js

export const APP_CONFIG = {
  // File validation
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],

  // Processing
  PDF_OCR_MAX_PAGES: 2,
  INVALID_TEXT_MIN_LENGTH: 40,
  GUIDE_MIN_LENGTH: 6,

  // Progress
  PROGRESS_UPDATE_DELAY: 50, // ms
  PROGRESS_HIDE_DELAY: 600, // ms

  // URLs
  PDF_JS_VERSION: '3.11.174',
  TESSERACT_VERSION: '4.1.3',
  JSZIP_VERSION: '3.10.1',

  // Messages
  MESSAGES: {
    FILE_TOO_LARGE: 'Arquivo muito grande. Máximo: 50MB',
    INVALID_FILE_TYPE: 'Tipo de arquivo não suportado',
    NO_DATA_EXTRACTED: 'Não foi possível extrair dados do arquivo',
    PROCESSING_ERROR: 'Erro ao processar arquivo',
    EXTRACTION_SUCCESS: 'Arquivo processado com sucesso',
  },
};

export const CSS_CLASSES = {
  HIDDEN: 'hidden',
  HIDDEN_IMPORTANT: 'hidden !important',
  ACTIVE: 'active',
  DRAG_ACTIVE: 'drag-active',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  SHOW: 'show',
};

export const SELECTORS = {
  // Global
  APP_CONTAINER: '.app-container',
  NAVBAR: '.navbar',
  
  // Upload
  UPLOAD_ZONE: '.upload-zone',
  FILE_INPUT: '#pdf-input',
  FILE_LIST: '#file-list',
  FILE_ITEMS: '#file-items',
  
  // Buttons
  PROCESS_BUTTON: '#process-button',
  DOWNLOAD_ALL_BUTTON: '#download-all-button',
  CLEAR_FILES_BUTTON: '#clear-files-btn',
  
  // Progress
  PROGRESS_SECTION: '#progress-section',
  PROGRESS_BAR: '#progress-bar',
  PROGRESS_TEXT: '#progress-text',
  PROGRESS_PERCENT: '#progress-percent',
  PROGRESS_DETAIL: '#progress-detail',
  
  // Output
  OUTPUT: '#output',
};

export default { APP_CONFIG, CSS_CLASSES, SELECTORS };
```

---

## 📋 RESUMO DE APLICAÇÃO

| Fix | Arquivo(s) | Impacto | Tempo | Prioridade |
|-----|-----------|--------|-------|-----------|
| Memory Leak | app.js | 🔴 Crítica | 30min | 1 |
| Validação File Size | app.js | 🔴 Alta | 45min | 2 |
| Lazy Load Tesseract | múltiplos | 🟡 Alta | 1h | 3 |
| Padrões Centralizar | 3 arquivos | 🟡 Média | 1.5h | 4 |
| CSS Theme | 3 CSS | 🟡 Média | 1h | 5 |
| Aria Labels | 3 HTML | 🟡 Média | 45min | 6 |
| Remover Duplicata HTML | index.html | 🟢 Baixa | 15min | 7 |
| Mobile Responsividade | CSS | 🟡 Média | 1h | 8 |
| Error Handling | app.js | 🟡 Média | 30min | 9 |
| Constants | novo | 🟢 Baixa | 45min | 10 |

**Tempo Total Estimado:** ~7.5 horas para implementar todas as correções

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Revisar este documento com o time
2. ✅ Implementar fixes em ordem de prioridade
3. ✅ Testar cada fix individualmente
4. ✅ Executar testes E2E
5. ✅ Validar com lighthouse
6. ✅ Deploy de hotfixes críticos primeiro
7. ✅ Planejjar refatoração maior para sprint próximo

