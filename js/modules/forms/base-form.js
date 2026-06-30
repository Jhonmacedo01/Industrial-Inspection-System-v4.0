/**
 * INSPECTION FORM v3.0.0
 * Classe Base para Formulários de Inspeção
 * @module base-form
 */

class BaseFormManager {
    /**
     * @param {Object} config - Configuração do formulário
     * @param {string} config.containerId - ID do container
     * @param {string} config.formType - Tipo do formulário
     * @param {Array} config.items - Array de itens
     * @param {Object} [config.specialFields] - Campos especiais
     */
    constructor(config) {
        this.containerId = config.containerId;
        this.formType = config.formType;
        this.itemsConfig = config.items || [];
        this.specialFields = config.specialFields || {};
        this.container = null;
        this.items = [];
        this.observers = [];
        this.initialized = false;
    }

    /**
     * Inicializa o formulário
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn(`[${this.formType}] Container #${this.containerId} não encontrado`);
            return;
        }

        this.render();
        this.attachEvents();
        this.updateSummary();
        this.initialized = true;
        console.log(`[${this.formType}] Formulário inicializado (${this.itemsConfig.length} itens)`);
    }

    /**
     * Renderiza a estrutura base do formulário
     */
    render() {
        // Deve ser sobrescrito pelas subclasses
        throw new Error('Método render() deve ser implementado pela subclasse');
    }

    /**
     * Cria um card de inspeção padrão
     * @param {Object} item - Configuração do item
     * @returns {HTMLElement}
     */
    createStandardCard(item) {
        const card = document.createElement('div');
        card.className = 'inspection-card';
        card.dataset.item = item.number;

        const measureBadge = item.measure
            ? `<span class="card-measure-badge"><i class="fas fa-clipboard"></i> ${escapeHtml(item.measure)}</span>`
            : '';

        const description = item.description
            ? `<p class="card-description"><i class="fas fa-info-circle"></i> ${escapeHtml(item.description)}</p>`
            : '';

        card.innerHTML = `
            <div class="card-header">
                <span class="card-number">ITEM ${String(item.number).padStart(2, '0')}</span>
                <span class="card-title">${escapeHtml(item.title)}</span>
                ${measureBadge}
            </div>
            <div class="card-body">
                ${description}
                <div class="status-options">
                    <label class="status-option status-option--ok" data-status="OK">
                        <span class="option-dot"></span>
                        <span>CONFORME</span>
                        <input type="radio" name="${this.formType}_status_${item.number}" value="OK">
                    </label>
                    <label class="status-option status-option--nok" data-status="NOK">
                        <span class="option-dot"></span>
                        <span>NÃO CONFORME</span>
                        <input type="radio" name="${this.formType}_status_${item.number}" value="NOK">
                    </label>
                </div>
                <textarea
                    class="annotation-field"
                    placeholder="Anotações (obrigatório para NÃO CONFORME)"
                    rows="3"
                    data-item="${item.number}"
                    maxlength="${CONFIG.UI.maxAnnotationLength}"
                ></textarea>
            </div>
        `;

        return card;
    }

    /**
     * Cria o cabeçalho da seção com sumários
     * @param {string} iconClass - Classe do ícone Font Awesome
     * @param {string} title - Título da seção
     * @returns {string} HTML
     */
    createSectionHeader(iconClass, title) {
        return `
            <div class="section-heading">
                <i class="fas ${iconClass}"></i>
                <h2>${escapeHtml(title)}</h2>
            </div>
        `;
    }

    /**
     * Cria os cards de sumário (total, OK, NOK)
     * @returns {string} HTML
     */
    createSummaryCards() {
        return `
            <div class="summary-row">
                <div class="summary-card">
                    <i class="fas fa-list"></i>
                    <div class="card-value">${this.itemsConfig.length}</div>
                    <div class="card-label">Itens Totais</div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-check-circle"></i>
                    <div class="card-value" id="${this.formType}-ok-count">0</div>
                    <div class="card-label">Conformes</div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-times-circle"></i>
                    <div class="card-value" id="${this.formType}-nok-count">0</div>
                    <div class="card-label">Não Conformes</div>
                </div>
            </div>
        `;
    }

    /**
     * Anexa eventos aos cards
     */
    attachEvents() {
        if (!this.container) return;

        // Mudança nos radios
        this.container.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const itemNumber = this._extractItemNumber(e.target.name);
                const status = e.target.value;
                const item = this.items.find(i => i.number === itemNumber);

                if (item) {
                    item.status = status;
                    this._updateCardVisual(item.element, status);
                    this.updateSummary();
                    this.notifyObservers();
                }
            }
        });

        // Input nas anotações
        this.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('annotation-field')) {
                const itemNumber = parseInt(e.target.dataset.item, 10);
                const item = this.items.find(i => i.number === itemNumber);
                if (item) {
                    item.annotations = e.target.value;
                    this.notifyObservers();
                }
            }
        });

        // Click nos labels de status
        this.container.addEventListener('click', (e) => {
            const statusOption = e.target.closest('.status-option');
            if (statusOption) {
                const radio = statusOption.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }

    /**
     * Atualiza os cards de sumário
     */
    updateSummary() {
        const okCount = this.items.filter(i => i.status === 'OK').length;
        const nokCount = this.items.filter(i => i.status === 'NOK').length;

        this._setText(`${this.formType}-ok-count`, okCount);
        this._setText(`${this.formType}-nok-count`, nokCount);

        // Badge da tab
        const badge = document.querySelector(`#tab-${this.formType} .tab-badge`);
        if (badge) {
            badge.textContent = nokCount > 0 ? nokCount : '0';
        }
    }

    /**
     * Retorna os dados do formulário
     * @returns {Object}
     */
    getData() {
        return {
            formType: this.formType,
            items: this.items.map(i => ({
                number: i.number,
                title: i.title,
                status: i.status || '',
                annotations: i.annotations || ''
            }))
        };
    }

    /**
     * Carrega dados salvos
     * @param {Object} data - Dados a carregar
     */
    loadData(data) {
        if (!data?.items) return;

        data.items.forEach(savedItem => {
            const item = this.items.find(i => i.number === savedItem.number);
            if (!item) return;

            // Restaurar status
            if (savedItem.status) {
                const radio = item.element.querySelector(
                    `input[type="radio"][value="${savedItem.status}"]`
                );
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Restaurar anotações
            const textarea = item.element.querySelector('.annotation-field');
            if (textarea && savedItem.annotations) {
                textarea.value = savedItem.annotations;
                item.annotations = savedItem.annotations;
            }
        });

        this.updateSummary();
    }

    /**
     * Reseta o formulário
     */
    reset() {
        this.items.forEach(item => {
            item.status = null;
            item.annotations = '';

            item.element.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            item.element.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('is-selected'));
            const textarea = item.element.querySelector('.annotation-field');
            if (textarea) textarea.value = '';

            item.element.classList.remove('is-ok', 'is-nok');
        });

        this.updateSummary();
        this.notifyObservers();
    }

    /**
     * Registra um observer
     * @param {Function} callback
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.push(callback);
        }
    }

    /**
     * Notifica observers
     */
    notifyObservers() {
        const data = this.getData();
        this.observers.forEach(cb => {
            try {
                cb(this.formType, data);
            } catch (error) {
                console.error(`[${this.formType}] Erro em observer:`, error);
            }
        });
    }

    /** @private */
    _updateCardVisual(element, status) {
        // Atualizar classes visuais
        element.querySelectorAll('.status-option').forEach(opt => {
            const optStatus = opt.dataset.status;
            opt.classList.toggle('is-selected', optStatus === status);
        });

        // Atualizar borda do card
        element.classList.remove('is-ok', 'is-nok');
        if (status === 'OK') element.classList.add('is-ok');
        if (status === 'NOK') element.classList.add('is-nok');
    }

    /** @private */
    _extractItemNumber(name) {
        const parts = name.split('_');
        return parseInt(parts[parts.length - 1], 10);
    }

    /** @private */
    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}

window.BaseFormManager = BaseFormManager;