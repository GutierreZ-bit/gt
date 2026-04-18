# H.Olhos - Sistema de Gerenciamento de Guias Médicas

Suite completa de ferramentas Web para gerenciar e gerar guias médicas em PDF. Três aplicativos com interface elegante e profissional SaaS.

## 🎯 Três Ferramentas Principais

### 1. **Renomeador de PDFs** (`index.html`)
Processa e renomeia guias PDF extraindo dados do documento automaticamente.

- ✅ Lê PDFs e extrai nome do paciente e número da guia
- ✅ Suporte a OCR para PDFs escaneados/imagens  
- ✅ Interface intuitiva com drag-and-drop
- ✅ Download individual ou em lote (ZIP)
- ✅ Reconhecimento de múltiplos formatos e padrões
- ✅ Progresso em tempo real

**Acesso:** https://seu-dominio/index.html

### 2. **Gerador de Guias em Lote** (`generator.html`)
Cria múltiplas cópias de um modelo de PDF com dados personalizados.

- ✅ Interface moderna e elegante (design SaaS)
- ✅ Upload de arquivo PDF modelo
- ✅ Definir quantidade de guias (1-100)
- ✅ Nomes fictícios aleatórios (40+ nomes variados)
- ✅ Numeração sequencial personalizável
- ✅ Progresso visual animado
- ✅ Download em lote (ZIP)
- ✅ 100% responsivo

**Acesso:** https://seu-dominio/generator.html

### 3. **Gerador de Números de Guia** (`guide-number-generator.html`)
Ferramenta simples e eficiente para gerar séries de números com formatação personalizada.

- ✅ Definir intervalo de números (até 1000)
- ✅ Adicionar prefixo e sufixo customizados
- ✅ Preenchimento com zeros (padding)
- ✅ Pré-visualização em tempo real
- ✅ Export para CSV ou TXT
- ✅ Copiar para área de transferência
- ✅ Design limpo e intuitivo

**Acesso:** https://seu-dominio/guide-number-generator.html

## 🎓 Como Usar

### Renomeador de PDFs
1. Acesse a ferramenta
2. Arraste/clique para selecionar PDF(s)
3. Clique "Processar PDFs"
4. Baixe individual ou em ZIP

### Gerador de Guias
1. Carregue um PDF modelo
2. Configure: quantidade, nome, número inicial
3. Clique "Gerar PDFs"
4. Download em ZIP quando pronto

### Gerador de Números
1. Defina número inicial e final
2. (Opcional) Adicione prefixo/sufixo
3. Clique "Mostrar Pré-visualização"
4. Baixe como CSV, TXT ou copie

## 💻 Tecnologias

- **PDF.js**: Leitura de PDFs
- **Tesseract.js**: OCR para PDFs escaneados
- **JSZip**: Compactação de arquivos
- **HTML5/CSS3/JavaScript**: Interface moderna
- **Design**: SaaS moderno com gradientes, animações, tipografia profissional

## 📋 Padrões Suportados (Renomeador)

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
- ⚡ Animações fluidas em botões e transições
- 📱 100% responsivo (mobile: 480px até desktop)
- 🎪 Feedback visual em tempo real
- 🔔 Status e progresso animados
- 🧭 Navegação intuitiva entre ferramentas

## 📦 Instalação

O projeto já está hospedado em GitHub Pages e funciona direto no navegador.

Ou, para uso local:

```bash
git clone https://github.com/GutierreZ-bit/gt.git
cd h.olhos
# Abra index.html, generator.html ou guide-number-generator.html no navegador
```

## 📝 Observações Importantes

- ✅ Funciona completamente no navegador (sem servidor necessário)
- ✅ PDFs processados localmente - nenhum arquivo enviado para servidores
- ✅ OCR ativado automaticamente para PDFs sem texto pesquisável
- ✅ Máximo 100 guias por geração para performance otimizada
- ✅ Suporta múltiplos idiomas em OCR (português configurado por padrão)
- ✅ Limite de 1000 números por geração

## 🔐 Privacidade

- Todos os dados são processados localmente no seu navegador
- Nenhum arquivo é armazenado em servidores
- Nenhum rastreamento ou coleta de dados
- Completa privacidade do usuário

## 🗂️ Estrutura de Arquivos

```
h.olhos/
├── index.html                    # Renomeador de PDFs
├── styles.css                    # Estilos renomeador
├── app.js                        # Lógica renomeador
├── generator.html                # Gerador em lote
├── generator-styles.css          # Estilos gerador
├── generator-app.js              # Lógica gerador
├── guide-number-generator.html   # Gerador de números
├── guide-number-styles.css       # Estilos números
├── guide-number-app.js           # Lógica números
└── README.md                     # Este arquivo
```

## 📞 Suporte

Para problemas ou sugestões, abra uma issue no repositório GitHub.

---

**H.Olhos** • Sistema Profissional de Geração e Gerenciamento de Guias Médicas • 2026


