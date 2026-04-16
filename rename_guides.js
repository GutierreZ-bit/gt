import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse";

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

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

async function extractTextFromPdf(filePath) {
  const data = await fs.promises.readFile(filePath);
  const parsed = await pdf(data);
  return parsed.text || "";
}

function normalizeName(value) {
  const cleaned = value.trim().replace(/\s+/g, "_").replace(INVALID_FILENAME_CHARS, "");
  return cleaned || "";
}

function findPatientNames(text) {
  const names = [];
  for (const pattern of PATIENT_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const patient = match[1].trim();
      if (patient && !names.includes(patient)) {
        names.push(patient);
      }
    }
  }
  return names;
}

function findGuideNumbers(text) {
  const guides = [];
  for (const pattern of GUIDE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const guide = match[1].trim();
      if (guide && !guides.includes(guide)) {
        guides.push(guide);
      }
    }
  }
  return guides;
}

function buildRenamedFilename(patient, guide, originalPath) {
  const safePatient = normalizeName(patient) || path.basename(originalPath, path.extname(originalPath));
  const safeGuide = normalizeName(guide) || "guia";
  return `${safePatient}_${safeGuide}${path.extname(originalPath)}`;
}

function selectPair(patients, guides, requestedGuide = null) {
  if (requestedGuide) {
    const index = guides.indexOf(requestedGuide);
    if (index !== -1) {
      return [patients[index] || patients[0] || "", guides[index]];
    }
  }
  if (patients.length > 0 && guides.length > 0) {
    return [patients[0], guides[0]];
  }
  if (patients.length > 0) {
    return [patients[0], guides[0] || ""];
  }
  if (guides.length > 0) {
    return ["", guides[0]];
  }
  return null;
}

async function renamePdf(inputPath, outputDir = null, guideNumber = null) {
  const text = await extractTextFromPdf(inputPath);
  const patients = findPatientNames(text);
  const guides = findGuideNumbers(text);
  const pair = selectPair(patients, guides, guideNumber);

  if (!pair) {
    throw new Error("Não foi possível extrair o nome do paciente ou número da guia do PDF.");
  }

  const [patient, guide] = pair;
  const newFilename = buildRenamedFilename(patient, guide, inputPath);
  const targetDir = outputDir ? outputDir : path.dirname(inputPath);
  const outputPath = path.join(targetDir, newFilename);

  if (path.resolve(outputPath) === path.resolve(inputPath)) {
    return outputPath;
  }

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.rename(inputPath, outputPath);
  return outputPath;
}

function parseArgs(argv) {
  const args = {
    pdfs: [],
    outputDir: null,
    guideNumber: null,
  };

  const positional = [];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output-dir" && i + 1 < argv.length) {
      args.outputDir = argv[++i];
    } else if (arg === "--guide" && i + 1 < argv.length) {
      args.guideNumber = argv[++i];
    } else if (arg.startsWith("--")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    throw new Error("Use: node rename_guides.js arquivo1.pdf [arquivo2.pdf ...] [--output-dir pasta] [--guide 12345]");
  }

  args.pdfs = positional;
  return args;
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    let hadError = false;

    for (const pdfPath of args.pdfs) {
      const resolvedPath = path.resolve(pdfPath);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Arquivo não encontrado: ${resolvedPath}`);
        hadError = true;
        continue;
      }
      try {
        const outputPath = await renamePdf(resolvedPath, args.outputDir ? path.resolve(args.outputDir) : null, args.guideNumber);
        console.log(`PDF renomeado com sucesso: ${outputPath}`);
      } catch (error) {
        console.error(`Erro ao processar ${resolvedPath}: ${error.message}`);
        hadError = true;
      }
    }

    process.exit(hadError ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
