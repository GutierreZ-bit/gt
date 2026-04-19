/**
 * MÓDULO DE LOGGING E ERROR HANDLING
 * Centraliza tratamento de erros e logging
 */

class Logger {
  constructor(namespace = "App") {
    this.namespace = namespace;
    this.isDevelopment = !window.location.hostname.includes("github");
  }

  /**
   * Log de informação
   */
  info(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] [${this.namespace}] ℹ️ ${message}`;
    console.log(msg, data || "");
  }

  /**
   * Log de aviso
   */
  warn(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] [${this.namespace}] ⚠️ ${message}`;
    console.warn(msg, data || "");
  }

  /**
   * Log de erro
   */
  error(message, error = null) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] [${this.namespace}] ❌ ${message}`;
    console.error(msg, error || "");
    
    // Em desenvolvimento, lança o erro também
    if (this.isDevelopment && error) {
      console.error("Stack trace:", error.stack);
    }
  }

  /**
   * Log de sucesso
   */
  success(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] [${this.namespace}] ✅ ${message}`;
    console.log(msg, data || "");
  }
}

/**
 * Classe para gerenciar erros consistentemente
 */
class AppError extends Error {
  constructor(message, code = "UNKNOWN_ERROR", statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Retorna objeto JSON para logging/analytics
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Erros específicos do aplicação
 */
class FileValidationError extends AppError {
  constructor(message) {
    super(message, "FILE_VALIDATION_ERROR", 400);
    this.name = "FileValidationError";
  }
}

class ExtractionError extends AppError {
  constructor(message, fileName = "") {
    super(message, "EXTRACTION_ERROR", 422);
    this.name = "ExtractionError";
    this.fileName = fileName;
  }
}

class ProcessingError extends AppError {
  constructor(message) {
    super(message, "PROCESSING_ERROR", 500);
    this.name = "ProcessingError";
  }
}

/**
 * Wrapper para chamadas assíncronas com tratamento de erro
 */
async function safeAsync(promiseFn, fallbackValue = null) {
  try {
    return await promiseFn();
  } catch (error) {
    console.error("Async operation failed:", error);
    return fallbackValue;
  }
}

/**
 * Retry logic para operações que podem falhar temporariamente
 */
async function retryAsync(promiseFn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await promiseFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

// Criação de logger global
const logger = new Logger("H.Olhos");

// Exportar ou tornar disponível globalmente
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Logger,
    AppError,
    FileValidationError,
    ExtractionError,
    ProcessingError,
    safeAsync,
    retryAsync,
    logger,
  };
}
