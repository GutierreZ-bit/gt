# H.Olhos - Sistema de Gerenciamento de Guias Médicas

Suite completa de ferramentas Web para gerenciar e gerar guias médicas em PDF. Dois aplicativos principais com interface moderna e profissional.

## 🎯 Funcionalidades Principais

### 1. **Renomeador de PDFs** (`index.html`)
Processa e renomeia guias PDF automaticamente extraindo dados do documento.

- ✅ Lê PDFs e extrai nome do paciente e número da guia
- ✅ Suporte a OCR para PDFs escaneados/imagens
- ✅ Interface intuitiva com drag-and-drop
- ✅ Download individual ou em lote (ZIP)
- ✅ Reconhecimento de múltiplos formatos e padrões
- ✅ Progresso em tempo real

### 2. **Gerador de Guias em Lote** (`generator.html`)
Cria múltiplas cópias de um modelo de PDF com dados personalizados.

- ✅ Interface moderna e elegante (design SaaS)
- ✅ Upload de arquivo PDF modelo
- ✅ Definir quantidade de guias a gerar
- ✅ Nomes fictícios aleatórios (ou personalizados)
- ✅ Numeração sequencial de guias
- ✅ Progresso visual durante geração
- ✅ Download em lote (ZIP)
- ✅ Totalmente responsivo

## 🚀 Como Usar

### Renomeador de PDFs
1. Acesse: `https://seu-dominio/index.html`
2. Arraste/clique para selecionar PDF(s)
3. Clique "Processar PDFs"
4. Baixe individual ou em ZIP

### Gerador de Guias
1. Acesse: `https://seu-dominio/generator.html`
2. Carregue um PDF modelo
3. Configure: quantidade, nome, número inicial
4. Clique "Gerar PDFs"
5. Download em ZIP quando pronto

## 💻 Tecnologias

- **PDF.js**: Leitura de PDFs
- **Tesseract.js**: OCR para PDFs escaneados
- **JSZip**: Compactação de arquivos
- **HTML5/CSS3/JavaScript**: Interface moderna
- **Design**: SaaS moderno com gradientes, animações e tipografia profissional

## 📋 Padrões Suportados

O renomeador reconhece automaticamente:

```
- "código 10 - Nome" / "código 7 - Número da Guia Atribuido pela Operadora"
- "10 - Nome" / "7 - Número da Guia"
- "Nome do Beneficiário" / "Número da Guia no Prestador"
- "Nome do Paciente" / "Número da guia"
- Múltiplos formatos TISS e autorizações
```

## 🎨 Design & UX

- ✨ Interface moderna com tons de azul, branco e cinza
- 🎯 Cards com bordas arredondadas e sombras suaves
- ⚡ Animações fluidas nos botões e transições
- 📱 100% responsivo (mobile, tablet, desktop)
- 🎪 Feedback visual em andamento
- 🔔 Status e progresso em tempo real

## 📦 Instalação

O projeto já está hospedado em GitHub Pages e funciona direto no navegador.

Ou, para uso local:

```bash
git clone https://github.com/GutierreZ-bit/gt.git
cd h.olhos
# Abra index.html ou generator.html no navegador
```

## 📝 Observações Importantes

- Funciona completamente no navegador (sem servidor necessário)
- PDFs são processados localmente - nenhum arquivo é enviado para servidores
- OCR é ativado automaticamente para PDFs sem texto pesquisável
- Máximo 100 guias por geração para máquina performance optimizada
- Suporta múltiplos idiomas em OCR (português configurado por padrão)

## 🔐 Privacidade

- Todos os dados são processados localmente no seu navegador
- Nenhum arquivo é armazenado em servidores
- Nenhum rastreamento ou coleta de dados

## 📞 Suporte

Para problemas ou sugestões, abra uma issue no repositório GitHub.

---

**H.Olhos** • Sistema Profissional de Geração e Gerenciamento de Guias Médicas • 2026

