# Inspection Form v3.1.0

![Version](https://img.shields.io/badge/version-3.1.0-blue)
![Theme](https://img.shields.io/badge/theme-Cisco%20Catalyst%20Industrial-006994)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)
![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)

## 📋 Sobre

**Inspection Form** é um sistema web profissional para inspeção industrial que substitui formulários físicos por uma plataforma digital centralizada com tema visual Cisco Catalyst.

### 🎯 Funcionalidades

| Funcionalidade | Status |
|---|---|
| 4 formulários de inspeção (50 itens) | ✅ |
| GNSS (10 itens) | ✅ |
| CFTV (9 itens) | ✅ |
| Rádio (8 itens + métricas BER/RSSI/SNR) | ✅ |
| PLC (23 itens + LEDs/OZD) | ✅ |
| Tema Cisco Catalyst Industrial | ✅ |
| Exportação TXT (Completo/Resumo NOK) | ✅ |
| Exportação JSON | ✅ |
| AutoSave (localStorage) | ✅ |
| Validação em tempo real | ✅ |
| Atalhos de teclado | ✅ |
| Design responsivo | ✅ |
| Acessibilidade (ARIA) | ✅ |
| Zero dependências | ✅ |

### 🚀 Tecnologias

- **HTML5** semântico com ARIA
- **CSS3** (Custom Properties, Flexbox, Grid)
- **JavaScript ES6+** (Classes, Módulos, Observer Pattern)
- **APIs**: localStorage, Blob, URL

### 📁 Estrutura
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
