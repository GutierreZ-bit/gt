/**
 * PADRÕES CENTRALIZADOS PARA EXTRAÇÃO DE DADOS
 * Arquivo único compartilhado entre app.js, rename_guides.js e test-extraction.js
 * 
 * Evita duplicação e facilita manutenção
 */

const EXTRACTION_PATTERNS = {
  /**
   * Padrões para encontrar NOME DO PACIENTE/BENEFICIÁRIO
   * Suporta múltiplos formatos de documentos da saúde
   */
  patient: [
    /Nome do Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do Titular\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Paciente\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Beneficiário\s*[:\-]?\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /Nome do Beneficiário\s*\n?\s*(.+?)\s*(?:\r?\n|$)/gi,
    /10 - Nome\s*(.+?)\s*11 -/gi,
    /código 10 - Nome\s*(.+?)\s*(?:\r?\n|$)/gi,
  ],

  /**
   * Padrões para encontrar NÚMERO DA GUIA
   * Suporta múltiplos formatos de números de guia (6-10 dígitos)
   */
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

/**
 * Encontra o primeiro match usando uma lista de padrões regex
 * @param {string} text - Texto para buscar
 * @param {RegExp[]} patterns - Array de padrões regex
 * @returns {string|null} - Primeiro match encontrado ou null
 */
function findFirstMatch(text, patterns) {
  for (const regex of patterns) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const result = match[1].trim();
      // Validação extra para guias: deve ter pelo menos 6 dígitos
      if (patterns === EXTRACTION_PATTERNS.guide && result.length < 6) {
        continue;
      }
      return result;
    }
  }
  return null;
}

/**
 * Normaliza texto removendo espaços excessivos e caracteres especiais
 * @param {string} text - Texto para normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeText(text) {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 * @param {string} text - Texto original
 * @returns {string} - Texto sanitizado para uso em nome de arquivo
 */
function sanitizeForFilename(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s\-]/g, "")
    .replace(/[\s\-]+/g, "_")
    .toLowerCase()
    .slice(0, 100);
}
