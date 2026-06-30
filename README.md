# Industrial Inspection System v3.1.0

![Version](https://img.shields.io/badge/version-3.1.0-blue)
![Theme](https://img.shields.io/badge/theme-Cisco%20Catalyst%20Industrial-006994)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)
![Dependencies](https://img.shields.io/badge/dependencies-JSZip-orange)
![Platform](https://img.shields.io/badge/platform-Web-blueviolet)
![Mobile](https://img.shields.io/badge/mobile-Responsive-success)

## 📋 Sobre

**Industrial Inspection System** é um sistema web profissional para inspeção industrial que substitui formulários físicos por uma plataforma digital centralizada com tema visual Cisco Catalyst Industrial.

Desenvolvido para facilitar o trabalho de equipes de manutenção e inspeção, oferecendo uma interface intuitiva, captura de fotos integrada e exportação completa de relatórios.

---

## 🎯 Funcionalidades

| Funcionalidade | Status |
|---|---|
| **5 formulários de inspeção (65 itens)** | ✅ |
| GNSS (10 itens) | ✅ |
| CFTV (9 itens) | ✅ |
| Rádio (8 itens + métricas BER/RSSI/SNR) | ✅ |
| PLC (23 itens + LEDs/OZD) | ✅ |
| SWITCH (15 itens + temperatura) | ✅ |
| Campos globais LOCAL, OM, TAG | ✅ |
| **Captura de Fotos (Câmera/Galeria)** | ✅ |
| **Exportação ZIP com fotos e relatório** | ✅ |
| Tema Cisco Catalyst Industrial | ✅ |
| Exportação TXT (Completo/Resumo NOK) | ✅ |
| Exportação JSON | ✅ |
| AutoSave (localStorage) | ✅ |
| Validação em tempo real | ✅ |
| Atalhos de teclado | ✅ |
| Design responsivo | ✅ |
| Acessibilidade (ARIA) | ✅ |
| Zero dependências (exceto JSZip) | ✅ |

---

## 📸 Captura de Fotos

### Recursos
- **Câmera**: Abre a câmera do dispositivo para captura instantânea com interface dedicada
- **Galeria**: Seleciona múltiplas imagens da biblioteca
- **Drag & Drop**: Arraste imagens para a área de upload
- **Grid**: Visualização em grade com preview das fotos
- **Remoção**: Clique no ícone X ou tecla Delete/Backspace
- **Limite**: Máximo de 40 fotos por formulário
- **Progresso**: Barra de progresso durante o upload
- **Seleção**: Clique para selecionar, Delete para remover

### Interface da Câmera
- Overlay dedicado com visual profissional
- Botão "Capturar" com feedback visual
- Botão "Fechar" para cancelar
- Tecla ESC para fechar rapidamente

---

## 📥 Exportação ZIP

O ZIP gerado contém:

1. **relatorio_inspecao.html** - Relatório completo em HTML com:
   - Cabeçalho com identificação (LOCAL, OM, TAG)
   - Resumo estatístico (total, OK, NOK)
   - Todos os itens de inspeção com status
   - Anotações de cada item
   - Galeria de fotos organizada por formulário
   - Design profissional e responsivo
   - Otimizado para impressão

2. **dados.json** - Dados estruturados para integração com outros sistemas

3. **fotos/** - Pasta com todas as evidências fotográficas organizadas por formulário

**Nome do arquivo**: `inspecao_[LOCAL]_[DATA].zip`

---

### 📁 Estrutura do Projeto
inspection-form/
│
├── 📄 index.html                          # Página principal da aplicação
├── 📄 README.md                           # Documentação do projeto
├── 📄 LICENSE                             # Licença MIT
├── 📄 NOTICE                              # Atribuições de terceiros
├── 📄 .gitignore                          # Arquivos ignorados pelo Git
│
├── 📁 css/
│   └── 📄 styles.css                      # Estilos consolidados (tema Cisco Catalyst)
│
├── 📁 js/
│   ├── 📄 config.js                       # Configurações globais e utilitários
│   ├── 📄 app.js                          # Orquestrador principal da aplicação
│   │
│   └── 📁 modules/
│       ├── 📁 forms/
│       │   ├── 📄 base-form.js            # Classe base abstrata (herança)
│       │   ├── 📄 gnss.js                 # Formulário GNSS (10 itens)
│       │   ├── 📄 cftv.js                 # Formulário CFTV (9 itens)
│       │   ├── 📄 radio.js                # Formulário Rádio (8 itens + alarmes)
│       │   └── 📄 plc.js                  # Formulário PLC (23 itens + LEDs/OZD)
│       │
│       └── 📁 utils/
│           ├── 📄 validation.js           # Validação de dados e campos
│           ├── 📄 auto-save.js            # Persistência local (localStorage)
│           └── 📄 export-manager.js        # Exportação de relatórios (TXT/JSON)
│
├── 📁 assets/                             # (opcional - não utilizado)
│   └── 📄 favicon.ico                     # Ícone da aplicação
│
└── 📁 docs/                               # (opcional - documentação extra)
    └── 📄 screenshots/                    # Screenshots da aplicação
