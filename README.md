[README_Desafio_Final.md](https://github.com/user-attachments/files/30202641/README_Desafio_Final.md)
# 🚢 Smart Part Flow

Sistema para conciliação inteligente de materiais de desenhos técnicos
industriais utilizando IA.

**Aplicação:** [[https://smartsystem-ws.lovable.app](https://smartsystem-ws.lovable.app)/]

## Objetivo

Automatizar a leitura da Bill of Materials (BOM) de desenhos técnicos em
PDF, comparar os materiais com o Jobbook e identificar divergências,
gerando pedidos de compra quando necessário.

## Tecnologias

-   **Front-end:** Lovable (React + TypeScript)
-   **IA:** Google Gemini 3.5 Flash
-   **Automação:** Make.com
-   **Banco de Dados:** Google Sheets

## Fluxo

1.  Upload do PDF.
2.  Envio para o Make.com.
3.  Armazenamento no Google Drive.
4.  Extração da BOM pelo Google Gemini.
5.  Comparação com o Jobbook.
6.  Atualização automática das planilhas.
7.  Exibição dos resultados no dashboard.

## Funcionalidades

-   Upload de desenhos técnicos em PDF.
-   Extração automática da lista de materiais.
-   Conciliação entre desenho e Jobbook.
-   Identificação de materiais faltantes.
-   Geração automática de pedidos.
-   Dashboard com consulta e atualização de pedidos.
-   Exportação de relatórios em PDF.

## Regras de Negócio

-   Processa apenas desenhos da disciplina de Tubulação.
-   A comparação é feita pelo **Part ID**.
-   A quantidade faltante é calculada pela diferença entre a quantidade
    solicitada e a quantidade enviada.
-   Apenas materiais com divergência geram pedidos.

## Autor

**André L.**

Projeto desenvolvido para o **Desafio 1 -- Power Developers (Wilson
Sons)**.
