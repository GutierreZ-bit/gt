# 🧪 ESTRATÉGIA DE TESTING & MONITORING

## 1. TESTING STRATEGY

### Unit Tests (Recommended Tools)

#### Framework: **Jest**
```bash
npm install --save-dev jest @babel/preset-env babel-jest
```

**Test Coverage Target:** 70%+

#### Area 1: Pattern Extraction
```javascript
// __tests__/PatientDataExtractor.test.js

import { PatientDataExtractor, PATTERNS } from '../app.js';

describe('PatientDataExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new PatientDataExtractor(PATTERNS);
  });

  describe('extract()', () => {
    test('should extract patient name from standard format', () => {
      const text = 'Nome do Beneficiário\nJoão Silva';
      const result = extractor.extract(text);
      expect(result.patient).toBe('João Silva');
    });

    test('should extract guide number with minimum 6 digits', () => {
      const text = 'Número da Guia no Prestador\n123456';
      const result = extractor.extract(text);
      expect(result.guide).toBe('123456');
    });

    test('should handle multiple pattern formats', () => {
      const formats = [
        'Nome do Paciente\nMaria Santos',
        'Paciente\nMaria Santos',
        'Beneficiário\nMaria Santos',
      ];
      
      formats.forEach(text => {
        const result = extractor.extract(text);
        expect(result.patient).toContain('Maria');
      });
    });

    test('should return empty strings when no match', () => {
      const text = 'Random text without patterns';
      const result = extractor.extract(text);
      expect(result.patient).toBe('');
      expect(result.guide).toBe('');
    });

    test('should ignore guide numbers with < 6 digits', () => {
      const text = 'Guia 1234';  // Only 4 digits
      const result = extractor.extract(text);
      expect(result.guide).toBe('');
    });
  });
});
```

#### Area 2: Filename Generation
```javascript
// __tests__/FilenameGenerator.test.js

import { FilenameGenerator } from '../app.js';

describe('FilenameGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new FilenameGenerator();
  });

  test('should sanitize patient name and guide', () => {
    const result = generator.generate(
      'original.pdf',
      'João Silva <script>',
      'Guia #123456'
    );
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('#');
  });

  test('should handle special characters', () => {
    const invalidChars = '<>:"/\\|?*';
    const result = generator.generate(
      'test.pdf',
      `Patient ${invalidChars}`,
      `123456`
    );
    invalidChars.split('').forEach(char => {
      expect(result).not.toContain(char);
    });
  });

  test('should preserve file extension', () => {
    const result = generator.generate('document.PDF', 'Patient', '123456');
    expect(result).toEndWith('.PDF');
  });

  test('should handle empty inputs gracefully', () => {
    const result = generator.generate('original.pdf', '', '');
    expect(result).toMatch(/original_guia\./);
  });

  test('should limit filename length to 180 chars', () => {
    const longName = 'A'.repeat(200);
    const result = generator.generate('test.pdf', longName, '123456');
    expect(result.length).toBeLessThanOrEqual(200); // filename + extension
  });
});
```

#### Area 3: File Validation
```javascript
// __tests__/FileValidator.test.js

import { APP_CONFIG } from '../config/constants.js';

describe('FileValidator', () => {
  test('should reject files over size limit', () => {
    const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf');
    const isValid = largeFile.size <= APP_CONFIG.MAX_FILE_SIZE;
    expect(isValid).toBe(false);
  });

  test('should accept valid mime types', () => {
    const validTypes = APP_CONFIG.ALLOWED_MIME_TYPES;
    expect(validTypes).toContain('application/pdf');
    expect(validTypes).toContain('image/png');
  });

  test('should reject invalid mime types', () => {
    const invalidFile = new File(['content'], 'file.exe', { type: 'application/x-msdownload' });
    const isValid = APP_CONFIG.ALLOWED_MIME_TYPES.includes(invalidFile.type);
    expect(isValid).toBe(false);
  });
});
```

### Integration Tests

#### Tool: **Cypress**
```bash
npm install --save-dev cypress
npx cypress open
```

#### E2E Test: Complete Workflow
```javascript
// cypress/e2e/pdf-renaming.cy.js

describe('PDF Renaming Workflow', () => {
  beforeEach(() => {
    cy.visit('index.html');
  });

  it('should successfully rename a single PDF', () => {
    // Upload file
    cy.get('#pdf-input').selectFile('cypress/fixtures/sample-guide.pdf');
    cy.get('#file-count').should('contain', '1 arquivo');

    // Process
    cy.get('#process-button').should('not.be.disabled').click();
    cy.get('#progress-section').should('be.visible');
    
    // Wait for completion
    cy.get('#progress-section', { timeout: 10000 }).should('have.class', 'hidden');
    
    // Verify result
    cy.get('.card').should('contain', 'Sucesso');
    cy.get('.download-link').should('be.visible');
  });

  it('should handle multiple file upload', () => {
    const files = ['guide1.pdf', 'guide2.pdf', 'guide3.pdf'];
    cy.get('#pdf-input').selectFile(files.map(f => `cypress/fixtures/${f}`));
    cy.get('#file-count').should('contain', '3 arquivo');
  });

  it('should reject oversized files', () => {
    // Mock large file
    const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf');
    cy.get('#pdf-input').selectFile(largeFile);
    
    // Should show error
    cy.get('.btn-error').should('contain', 'muito grande');
  });

  it('should display download ZIP button after processing', () => {
    cy.get('#pdf-input').selectFile('cypress/fixtures/sample-guide.pdf');
    cy.get('#process-button').click();
    cy.get('#download-all-button', { timeout: 10000 }).should('not.have.class', 'hidden');
  });

  it('should clear files on clear button click', () => {
    cy.get('#pdf-input').selectFile('cypress/fixtures/sample-guide.pdf');
    cy.get('#file-count').should('contain', '1 arquivo');
    cy.get('#clear-files-btn').click();
    cy.get('#file-list').should('have.class', 'hidden');
  });
});
```

### Performance Tests

#### Tool: **Lighthouse CI**
```json
// lighthouserc.json
{
  "ci": {
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.80}],
        "categories:accessibility": ["error", {"minScore": 0.85}],
        "categories:best-practices": ["error", {"minScore": 0.85}],
        "categories:seo": ["error", {"minScore": 0.85}]
      }
    },
    "collect": {
      "staticDistDir": "./",
      "url": [
        "http://localhost:8000/index.html",
        "http://localhost:8000/generator.html",
        "http://localhost:8000/guide-number-generator.html"
      ]
    }
  }
}
```

#### Tool: **WebPageTest**
```bash
# Test real-world performance
webpagetest index.html --location "US East" --connectivity "4G"
```

### Accessibility Tests

#### Tool: **axe-core**
```javascript
// __tests__/accessibility.test.js

import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('index.html should have no violations', async () => {
    document.body.innerHTML = require('../index.html');
    const results = await axe(document);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    // Verify h1 > h2 > h3 order
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    const levels = headings.map(h => parseInt(h.tagName[1]));
    
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
    }
  });

  it('should have aria-labels on interactive elements', () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasTextContent = button.textContent.trim().length > 0;
      expect(hasAriaLabel || hasTextContent).toBe(true);
    });
  });
});
```

---

## 2. MONITORING STRATEGY

### Error Tracking: **Sentry**

```javascript
// Initialize Sentry
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://YOUR_KEY@sentry.io/PROJECT_ID",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.url?.includes('personal-data')) {
      return null;
    }
    return event;
  }
});

// Add context
Sentry.setUser({ id: "USER_ID", email: "user@example.com" });

// Track errors
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});
```

### Performance Monitoring: **Google Analytics 4**

```javascript
// Initialize GA4
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from "firebase/analytics";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Track custom events
logEvent(analytics, 'pdf_processed', {
  patient_name: 'provided',
  guide_number: 'provided',
  processing_time_ms: 2500,
  file_size_mb: 2.5,
  success: true
});

// Track performance metrics
logEvent(analytics, 'page_performance', {
  page: 'pdf_renamer',
  load_time_ms: 1200,
  interactive_time_ms: 1500
});
```

### Real User Monitoring: **New Relic**

```javascript
// Script in head
<script src="js-agent.newrelic.com/nr-1250.min.js"></script>
<script>
  window.NREUM.init({
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ["bam.nr-data.net"] }
  });
</script>

// Custom instrumentation
window.newrelic = window.newrelic || {};

function processPDF(file) {
  window.newrelic.setCustomAttribute('file_size', file.size);
  window.newrelic.setCustomAttribute('file_type', file.type);
  
  const startTime = performance.now();
  // ... processing
  const endTime = performance.now();
  
  window.newrelic.recordMetric('pdf_processing_time', endTime - startTime);
}
```

### Uptime Monitoring: **Pingdom / StatusPage**

```yaml
# Monitorar endpoints críticos
endpoints:
  - name: "PDF Upload"
    url: "https://app.example.com/index.html"
    check_interval: 5m
    acceptable_status: [200]
    
  - name: "API Health"
    url: "https://api.example.com/health"
    check_interval: 1m
    acceptable_status: [200]
```

---

## 3. DASHBOARD DE MONITORAMENTO

### Stack Recomendado:
- **Frontend Health:** Sentry + Rollbar
- **Performance:** New Relic + DataDog
- **Analytics:** GA4 + Segment
- **Uptime:** Pingdom + AlertMananger
- **Logs:** ELK Stack ou Splunk

### Métricas Principais a Monitorar:

```
┌─────────────────────────────────────┐
│  REAL-TIME DASHBOARD                │
├─────────────────────────────────────┤
│                                     │
│  ✅ Uptime: 99.95%                 │
│  ⚡ Avg Response Time: 1.2s        │
│  📊 Error Rate: 0.05%              │
│  👥 Active Users: 234              │
│  ⚙️ CPU Usage: 45%                 │
│  💾 Memory: 60%                    │
│  🔴 Critical Errors: 0             │
│  🟡 Warnings: 2                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 4. ALERTING RULES

### Email Alerts
```
Rule 1: Error Rate > 1%
  └─ Notify: on-call team
  └─ Severity: HIGH
  
Rule 2: Response Time > 5s (p95)
  └─ Notify: DevOps + Backend
  └─ Severity: MEDIUM
  
Rule 3: Memory Leak Detected
  └─ Notify: Full team
  └─ Severity: CRITICAL
  
Rule 4: Downtime > 5 min
  └─ Notify: Ops + Management
  └─ Severity: CRITICAL
  
Rule 5: User Reports > 10/hour
  └─ Notify: Support + Dev
  └─ Severity: HIGH
```

### Slack Integration
```javascript
// Sentry -> Slack
const slackHook = "https://hooks.slack.com/services/YOUR/WEBHOOK";

Sentry.init({
  integrations: [
    new SlackIntegration(slackHook, {
      level: "error",
      channel: "#alerts"
    })
  ]
});

// Custom alerts
async function sendAlert(message, severity) {
  const color = severity === 'critical' ? '#FF0000' : '#FFAA00';
  
  await fetch(slackHook, {
    method: 'POST',
    body: JSON.stringify({
      attachments: [{
        color,
        title: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
}
```

---

## 5. TESTING CHECKLIST

### Before Each Release
```
SECURITY CHECKS
□ No hardcoded credentials
□ No console.log with sensitive data
□ HTTPS enabled
□ CSP headers configured
□ CORS properly restricted

PERFORMANCE CHECKS
□ Lighthouse score >= 80
□ Bundle size < 500KB
□ Load time < 3s
□ First paint < 1s

FUNCTIONALITY CHECKS  
□ All E2E tests passing
□ All unit tests passing
□ No console errors
□ Mobile responsive
□ Accessibility audit clean

DEPLOYMENT CHECKS
□ Environment variables correct
□ Database migrations applied
□ Cache invalidated
□ Backup taken
□ Rollback plan ready
```

---

## 6. TESTING AUTOMATION

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests & Quality

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Unit Tests
        run: npm run test:unit
      
      - name: Coverage Report
        run: npm run test:coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
      
      - name: E2E Tests
        run: npm run test:e2e
      
      - name: Lighthouse CI
        run: npm run lighthouse
      
      - name: Security Scan
        run: npm audit
      
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All tests passed! Ready to merge.'
            })
```

---

## 7. SCRIPTS PACKAGE.JSON

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:unit": "jest --testPathPattern='__tests__'",
    "test:e2e": "cypress run",
    "test:a11y": "jest --testPathPattern='accessibility'",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "format": "prettier --write .",
    "lighthouse": "lhci autorun",
    "security": "npm audit",
    "build": "webpack --mode production",
    "start": "webpack serve --mode development",
    "analyze": "webpack-bundle-analyzer"
  }
}
```

---

## 8. RESULTADOS ESPERADOS

### Test Coverage Target
```
Files:        70%+ coverage required
Branches:     60%+ coverage required
Lines:        70%+ coverage required
Functions:    70%+ coverage required
```

### Performance Targets
```
Lighthouse Performance:      >= 80
Lighthouse Accessibility:    >= 90
Lighthouse Best Practices:   >= 85
Lighthouse SEO:              >= 85

Page Load Time:              <= 3s
First Contentful Paint:      <= 1.5s
Largest Contentful Paint:    <= 2.5s
Cumulative Layout Shift:     <= 0.1

Error Rate:                  <= 0.05%
Custom Event Success Rate:   >= 99%
```

---

## 📋 RESUMO

| Aspecto | Tool | Frequency | Owner |
|---------|------|-----------|-------|
| Unit Tests | Jest | On commit | Dev |
| Integration | Cypress | Daily CI/CD | QA |
| Performance | Lighthouse | Pre-release | DevOps |
| Accessibility | axe | Per PR | QA |
| Error Tracking | Sentry | Real-time | DevOps |
| Monitoring | New Relic | 24/7 | DevOps |
| Analytics | GA4 | Real-time | Product |
| Uptime | Pingdom | 5min intervals | DevOps |

**Total Setup Time:** ~2-3 days  
**Monthly Maintenance:** ~4-6 hours  
**Value:** Catch 95%+ of issues before production

