/**
 * INSPECTION FORM v3.1.0
 * Módulo de AutoSave (localStorage) - COM SUPORTE A SWITCH
 * @module auto-save
 */

class AutoSaveManager {
    constructor() {
        /** Prefixo para chaves do localStorage */
        this.prefix = 'inspform_';

        /** Intervalo de autosave */
        this.intervalId = null;

        /** Timer de debounce */
        this.debounceTimer = null;

        /** Callbacks */
        this.onSaveCallbacks = [];
        this.onLoadCallbacks = [];

        /** Inicializar */
        this._startAutoSave();
        console.log('[AutoSave] Inicializado. Intervalo:', CONFIG.UI.autoSaveInterval / 1000, 's');
    }

    /**
     * Salva dados de um formulário
     * @param {string} formType - Tipo do formulário (gnss, cftv, radio, plc, switch)
     * @param {Object} data - Dados a salvar
     */
    save(formType, data) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                const payload = {
                    data,
                    timestamp: new Date().toISOString(),
                    version: CONFIG.VERSION,
                    formType
                };
                const key = `${this.prefix}${formType}`;
                localStorage.setItem(key, JSON.stringify(payload));
                this._updateLastSaved();
                this._notifySave(formType);
                console.log(`[AutoSave] ${formType} salvo com sucesso`);
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    this._cleanup();
                    window.showToast?.('Armazenamento cheio. Sessões antigas foram removidas.', 'warning');
                } else {
                    console.error('[AutoSave] Erro ao salvar:', error);
                }
            }
        }, CONFIG.UI.autoSaveDebounce);
    }

    /**
     * Carrega dados de um formulário
     * @param {string} formType - Tipo do formulário
     * @returns {Object|null} Dados salvos ou null
     */
    load(formType) {
        try {
            const key = `${this.prefix}${formType}`;
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const payload = JSON.parse(raw);
            this._notifyLoad(formType, payload.data);
            return payload.data;
        } catch (error) {
            console.error('[AutoSave] Erro ao carregar:', error);
            return null;
        }
    }

    /**
     * Carrega todos os formulários salvos
     * @returns {Object} Dados de todos os formulários
     */
    loadAll() {
        const result = {};
        const formTypes = ['gnss', 'cftv', 'radio', 'plc', 'switch'];
        formTypes.forEach(type => {
            result[type] = this.load(type);
        });
        return result;
    }

    /**
     * Remove dados salvos de um formulário
     * @param {string} formType - Tipo do formulário
     */
    remove(formType) {
        localStorage.removeItem(`${this.prefix}${formType}`);
        localStorage.removeItem(`${this.prefix}last_saved`);
    }

    /**
     * Remove todos os dados salvos
     */
    clearAll() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('[AutoSave] Todos os dados foram removidos');
    }

    /**
     * Salva manualmente todos os formulários
     */
    saveAllNow() {
        const managers = {
            gnss: window.gnssForm,
            cftv: window.cftvForm,
            radio: window.radioForm,
            plc: window.plcForm,
            switch: window.switchForm
        };

        Object.entries(managers).forEach(([type, manager]) => {
            if (manager && typeof manager.getData === 'function') {
                this.save(type, manager.getData());
            }
        });

        window.showToast?.('Sessão salva com sucesso!', 'success', 2000);
    }

    /**
     * Restaura todos os formulários salvos nos managers
     * @returns {number} Quantidade de formulários restaurados
     */
    restoreAll() {
        const managers = {
            gnss: window.gnssForm,
            cftv: window.cftvForm,
            radio: window.radioForm,
            plc: window.plcForm,
            switch: window.switchForm
        };

        let restored = 0;
        Object.entries(managers).forEach(([type, manager]) => {
            const data = this.load(type);
            if (data && manager && typeof manager.loadData === 'function') {
                try {
                    manager.loadData(data);
                    restored++;
                    console.log(`[AutoSave] ${type} restaurado com sucesso`);
                } catch (error) {
                    console.error(`[AutoSave] Erro ao restaurar ${type}:`, error);
                }
            }
        });

        if (restored > 0) {
            window.showToast?.(`${restored} formulários restaurados!`, 'success', 3000);
        } else {
            window.showToast?.('Nenhum dado salvo encontrado.', 'info', 2000);
        }

        return restored;
    }

    /**
     * Verifica se existem dados salvos
     * @returns {boolean}
     */
    hasSavedData() {
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i)?.startsWith(this.prefix)) return true;
        }
        return false;
    }

    /**
     * Registra callback para quando dados são salvos
     * @param {Function} callback - Função(formType, data)
     */
    onSave(callback) {
        if (typeof callback === 'function') {
            this.onSaveCallbacks.push(callback);
        }
    }

    /**
     * Registra callback para quando dados são carregados
     * @param {Function} callback - Função(formType, data)
     */
    onLoad(callback) {
        if (typeof callback === 'function') {
            this.onLoadCallbacks.push(callback);
        }
    }

    /** @private */
    _startAutoSave() {
        this.intervalId = setInterval(() => {
            this.saveAllNowSilent();
        }, CONFIG.UI.autoSaveInterval);
    }

    /** @private */
    saveAllNowSilent() {
        const managers = {
            gnss: window.gnssForm,
            cftv: window.cftvForm,
            radio: window.radioForm,
            plc: window.plcForm,
            switch: window.switchForm
        };

        Object.entries(managers).forEach(([type, manager]) => {
            if (manager && typeof manager.getData === 'function') {
                const data = manager.getData();
                if (ValidationManager.hasData(data)) {
                    this.save(type, data);
                }
            }
        });
    }

    /** @private */
    _updateLastSaved() {
        localStorage.setItem(`${this.prefix}last_saved`, new Date().toISOString());
    }

    /** @private */
    _notifySave(formType) {
        this.onSaveCallbacks.forEach(cb => {
            try { cb(formType); } catch (e) { /* silent */ }
        });
    }

    /** @private */
    _notifyLoad(formType, data) {
        this.onLoadCallbacks.forEach(cb => {
            try { cb(formType, data); } catch (e) { /* silent */ }
        });
    }

    /** @private */
    _cleanup() {
        // Remove as entradas mais antigas, mantendo apenas as mais recentes
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix) && key !== `${this.prefix}last_saved`) {
                const raw = localStorage.getItem(key);
                try {
                    const { timestamp } = JSON.parse(raw);
                    entries.push({ key, timestamp: new Date(timestamp) });
                } catch (e) { /* skip */ }
            }
        }

        entries.sort((a, b) => b.timestamp - a.timestamp);
        const toRemove = entries.slice(8); // Mantém apenas 8 mais recentes (5 formulários + 3)
        toRemove.forEach(({ key }) => localStorage.removeItem(key));
    }

    /** Destrutor */
    destroy() {
        if (this.intervalId) clearInterval(this.intervalId);
        clearTimeout(this.debounceTimer);
    }
}

// Inicializar após carregamento
let autoSaveManager = null;
document.addEventListener('DOMContentLoaded', () => {
    autoSaveManager = new AutoSaveManager();
    window.autoSaveManager = autoSaveManager;
});

window.AutoSaveManager = AutoSaveManager;