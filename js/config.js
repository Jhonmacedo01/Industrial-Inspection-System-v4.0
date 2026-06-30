/**
 * INSPECTION FORM v4.0.0
 * Configurações Globais
 * 
 * @license MIT
 * @copyright 2026 Inspection Form Team
 * @module config
 */

const CONFIG = Object.freeze({
    /** Versão do sistema */
    VERSION: '4.0.0',

    /** Nome do sistema */
    SYSTEM_NAME: 'Inspection Form',

    /** Tema visual */
    THEME: 'Cisco Catalyst Industrial v4',

    /** Informações de licenciamento */
    LICENSE: Object.freeze({
        type: 'MIT',
        copyright: `© ${new Date().getFullYear()} Inspection Form Team`,
        url: 'https://opensource.org/licenses/MIT',
        spdx: 'MIT'
    }),

    /** Configurações de exportação */
    EXPORT: Object.freeze({
        filenamePrefix: 'inspecao_industrial',
        encoding: 'UTF-8',
        mimeType: 'text/plain'
    }),

    /** Configurações de UI */
    UI: Object.freeze({
        toastDuration: 4000,
        autoSaveDebounce: 2000,
        autoSaveInterval: 30000,
        maxAnnotationLength: 500,
        maxPhotos: 40
    }),

    /** Status possíveis para itens de inspeção */
    STATUS: Object.freeze({
        OK: Object.freeze({ value: 'OK', label: 'Conforme', cssClass: 'ok' }),
        NOK: Object.freeze({ value: 'NOK', label: 'Não Conforme', cssClass: 'nok' })
    }),

    /** Validação */
    VALIDATION: Object.freeze({
        berMin: 0,
        berMax: 1,
        berWarnThreshold: 0.001,
        rssiMin: -120,
        rssiMax: -20,
        rssiWarnThreshold: -80,
        snrMin: 0,
        snrMax: 50,
        snrWarnThreshold: 20,
        warnOnEmptyExport: true
    }),

    /** Mapeamento de sistemas - 5 formulários */
    SYSTEMS: Object.freeze({
        gnss: Object.freeze({ 
            id: 'gnss', 
            name: 'GNSS', 
            icon: 'fa-satellite-dish', 
            itemCount: 10,
            color: '#006994',
            order: 1
        }),
        cftv: Object.freeze({ 
            id: 'cftv', 
            name: 'CFTV', 
            icon: 'fa-video', 
            itemCount: 9,
            color: '#006994',
            order: 2
        }),
        radio: Object.freeze({ 
            id: 'radio', 
            name: 'Rádio', 
            icon: 'fa-broadcast-tower', 
            itemCount: 8,
            color: '#006994',
            order: 3
        }),
        plc: Object.freeze({ 
            id: 'plc', 
            name: 'PLC', 
            icon: 'fa-microchip', 
            itemCount: 23,
            color: '#006994',
            order: 4
        }),
        switch: Object.freeze({ 
            id: 'switch', 
            name: 'SWITCH', 
            icon: 'fa-server', 
            itemCount: 15,
            color: '#7c3aed',
            order: 5
        })
    }),

    /** Campos de identificação global */
    IDENTIFICATION_FIELDS: Object.freeze({
        local: Object.freeze({
            key: 'local',
            label: 'LOCAL',
            placeholder: 'Ex: MINE',
            icon: 'fa-map-marker-alt',
            hint: 'Ex: MINE, SUBSOLO, SALA 101'
        }),
        om: Object.freeze({
            key: 'om',
            label: 'OM',
            placeholder: 'Ex: 202602113806',
            icon: 'fa-clipboard-list',
            hint: 'Ordem de Manutenção / Serviço'
        }),
        tag: Object.freeze({
            key: 'tag',
            label: 'TAG',
            placeholder: 'Ex: PB-6071KS-34',
            icon: 'fa-qrcode',
            hint: 'Identificação do equipamento'
        })
    })
});

/**
 * Formata data para nome de arquivo
 * @param {Date} [date=new Date()] - Data a formatar
 * @returns {string} Data formatada (YYYY-MM-DD_HH-mm-ss)
 */
function formatDateForFilename(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    if (!text && text !== 0) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
}

/**
 * Debounce para funções
 * @param {Function} fn - Função a executar
 * @param {number} delay - Atraso em ms
 * @returns {Function} Função com debounce
 */
function debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Atualiza o relógio ao vivo no header
 */
function updateLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;

    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    clockEl.textContent = formatted;
    clockEl.setAttribute('datetime', now.toISOString());
}

/** Inicializa o relógio */
function initClock() {
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
}

// Expor no escopo global
window.CONFIG = CONFIG;
window.formatDateForFilename = formatDateForFilename;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.initClock = initClock;

// Inicializar relógio
document.addEventListener('DOMContentLoaded', initClock);
