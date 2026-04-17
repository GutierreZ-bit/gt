import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse";

const PATTERNS = {
  patient: [
    /Nome do Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do Titular\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
  ],

  guide: [
    /Número da Guia no Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número Guia Prestador\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia principal\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /N[ºo]\s*Guia Operadora\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia TISS\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Número da guia\s*[:\-]?\s*\n?\s*(\d+)/gi,
    /Guia\s*(?:N(?:º|o|º?)|#)?\s*[:\-]?\s*\n?\s*(\d+)/gi,
  ],
};

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

async function extractTextFromPdf(filePath) {
  const data = await fs.promises.readFile(filePath);
  const parsed = await pdf(data);

  return normalizeText(parsed.text || "");
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function findFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    pattern.lastIndex = 0;

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function findByLabel(text, label) {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const index = lines.findIndex(line =>
    line.toLowerCase().includes(label.toLowerCase())
  );

  return index >= 0 && lines[index + 1]
    ? lines[index + 1].trim()
    : "";
}

function extractData(text) {
  const patient =
    findFirstMatch(text, PATTERNS.patient) ||
    findByLabel(text, "Nome do Beneficiário") ||
    findByLabel(text, "Paciente");

  const guide =
    findFirstMatch(text, PATTERNS.guide) ||
    findByLabel(text, "Número da Guia no Prestador") ||
    findByLabel(text, "Número da guia");

  return { patient, guide };
}

function sanitizeFilename(value) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(INVALID_FILENAME_CHARS, "")
    .slice(0, 180);
}

function buildRenamedFilename(originalPath, patient, guide) {
  const baseName = path.basename(originalPath, path.extname(originalPath));

  const safePatient = sanitizeFilename(patient || baseName);
  const safeGuide = sanitizeFilename(guide || "guia");

  return `${safePatient}_${safeGuide}${path.extname(originalPath)}`;
}

async function renamePdf(inputPath, outputDir = null) {
  const text = await extractTextFromPdf(inputPath);
  const { patient, guide } = extractData(text);

  if (!patient && !guide) {
    throw new Error("Não foi possível extrair nome do paciente ou número da guia.");
  }

  const newFilename = buildRenamedFilename(inputPath, patient, guide);
  const targetDir = outputDir || path.dirname(inputPath);
  const outputPath = path.join(targetDir, newFilename);

  await fs.promises.mkdir(targetDir, { recursive: true });

  if (path.resolve(inputPath) !== path.resolve(outputPath)) {
    await fs.promises.rename(inputPath, outputPath);
  }

  return outputPath;
}

function parseArgs(argv) {
  const args = {
    pdfs: [],
    outputDir: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--output-dir" && argv[i + 1]) {
      args.outputDir = path.resolve(argv[++i]);
    } else if (arg.startsWith("--")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    } else {
      args.pdfs.push(arg);
    }
  }

  if (!args.pdfs.length) {
    throw new Error(
      "Uso: node rename_guides.js arquivo1.pdf [arquivo2.pdf ...] [--output-dir pasta]"
    );
  }

  return args;
}

async function main() {
  try {
    const { pdfs, outputDir } = parseArgs(process.argv);

    let hasErrors = false;

    for (const file of pdfs) {
      try {
        const resolvedPath = path.resolve(file);

        if (!fs.existsSync(resolvedPath)) {
          console.error(`Arquivo não encontrado: ${resolvedPath}`);
          hasErrors = true;
          continue;
        }

        const outputPath = await renamePdf(resolvedPath, outputDir);
        console.log(`PDF renomeado: ${outputPath}`);
      } catch (error) {
        console.error(`Erro ao processar ${file}: ${error.message}`);
        hasErrors = true;
      }
    }

    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}