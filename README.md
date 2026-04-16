# Renomeador de PDFs de guias

Este projeto contém uma página web que lê PDFs de guias de autorização ou TISS, extrai o nome do paciente e o número da guia, e permite baixar o arquivo renomeado no formato:

`NomePaciente_Guia.pdf`

## Como usar

1. Abra o arquivo `index.html` no navegador.
2. Selecione um ou mais arquivos PDF.
3. Clique em "Processar PDFs".
4. Baixe os arquivos renomeados através dos links gerados.

## Observações

- O app funciona diretamente no navegador, sem instalar nada.
- O PDF deve conter texto pesquisável; PDFs digitalizados em imagem não funcionarão sem OCR.
- O nome final remove caracteres inválidos e usa `_` em vez de espaços.
