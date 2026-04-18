const PATTERNS = {
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
};

function find(text, patterns) {
  for (const regex of patterns) {
    const match = regex.exec(text);
    regex.lastIndex = 0;
    if (match?.[1]) {
      const result = match[1].trim();
      if (patterns === PATTERNS.guide && result.length < 6) {
        continue;
      }
      return result;
    }
  }
  return "";
}

function extract(text) {
  return {
    patient: find(text, PATTERNS.patient),
    guide: find(text, PATTERNS.guide),
  };
}

function generateFilename(originalName, patient, guide) {
  const safe = value => value.trim().replace(/\s+/g, "_").replace(/[<>:\"/\\|?*]/g, "");
  const extension = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf('.')) : '.pdf';
  return `${safe(patient || originalName)}_${safe(guide || 'guia')}${extension}`;
}

const samples = [
  {
    name: 'guia-sample.pdf',
    text: `código 10 - Nome\nCaio Alves Molina\n...\ncódigo 7 - Número da Guia Atribuido pela Operadora\n123456\n`,
  },
  {
    name: 'guia-sample-2.pdf',
    text: `10 - Nome Caio Alves Molina 11 -\n...\n7 - Número da Guia Atribuido pela Operadora 123456`,
  },
];

for (const { name, text } of samples) {
  const result = extract(text);
  console.log('---');
  console.log('Arquivo:', name);
  console.log('Texto de entrada:', text.replace(/\n/g, '\\n'));
  console.log('Paciente encontrado:', result.patient);
  console.log('Guia encontrado:', result.guide);
  console.log('Nome gerado:', generateFilename(name, result.patient, result.guide));
}
