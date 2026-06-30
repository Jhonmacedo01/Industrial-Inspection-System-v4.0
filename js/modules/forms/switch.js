/**
 * INSPECTION FORM v3.1.0
 * Formulário SWITCH (15 itens)
 * @module switch-form
 */

class SwitchFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-switch',
            formType: 'switch',
            items: [
                { 
                    number: 1, 
                    title: 'Verificar conservação do painel/rack',
                    description: 'Método: Visual | Padrão: Limpo, sem avarias e oxidação'
                },
                { 
                    number: 2, 
                    title: 'Verificar condições de vedação do painel/rack',
                    description: 'Método: Visual | Padrão: Não apresentar qualquer tipo de anomalias/avarias'
                },
                { 
                    number: 3, 
                    title: 'Inspecionar filtros de ar do rack',
                    description: 'Método: Visual | Padrão: Não apresentar qualquer tipo de anomalias/avarias'
                },
                { 
                    number: 4, 
                    title: 'Verificar fixação dos conduítes',
                    description: 'Método: Visual | Padrão: Bem encaixados e alocados'
                },
                { 
                    number: 5, 
                    title: 'Verificar organização dos cabos elétricos',
                    description: 'Método: Visual | Padrão: Cabos sem sinais de sobreaquecimento e degradação acentuada'
                },
                { 
                    number: 6, 
                    title: 'Inspeção visual da fixação dos plugs do rack',
                    description: 'Método: Visual | Padrão: Sem degradação acentuada e em condição de uso'
                },
                { 
                    number: 7, 
                    title: 'Verificar identificação TAG do painel',
                    description: 'Método: Visual | Padrão: TAG de identificação dos equipamentos existentes e legíveis'
                },
                { 
                    number: 8, 
                    title: 'Verificar acomodação dos cordões de fibra e/ou metálicos',
                    description: 'Método: Visual | Padrão: Sem avaria nas conexões, bem encaixados e alocados, sem dobras excessivas'
                },
                { 
                    number: 9, 
                    title: 'Verificar a sinalização (LEDs de status) do switch',
                    description: 'Método: Visual | Padrão: Não apresentar equipamentos sinalizando falhas'
                },
                { 
                    number: 10, 
                    title: 'Verificar temperatura do switch',
                    description: 'Método: Verificar no sistema, medidor de temperatura | Padrão: ≤ 60°C',
                    hasTemperature: true
                },
                { 
                    number: 11, 
                    title: 'Verificar limpeza do switch',
                    description: 'Método: Visual | Padrão: Limpo'
                },
                { 
                    number: 12, 
                    title: 'Verificar se o switch está fixo ao suporte no rack/painel',
                    description: 'Método: Visual | Padrão: Fixo'
                },
                { 
                    number: 13, 
                    title: 'Verificar se o switch apresenta ruídos do fluxo de ventilação',
                    description: 'Método: Visual/Auditivo | Padrão: Sem barulhos excessivos'
                },
                { 
                    number: 14, 
                    title: 'Abrir nota em caso de anormalidade',
                    measure: 'Registrar as anomalias no Solicitação de Manutenção'
                },
                { 
                    number: 15, 
                    title: 'Desmobilização e 5S',
                    measure: 'Verificar limpeza do local / Certificar que todos os resíduos gerados foram devidamente descartados'
                }
            ]
        });

        /** Campo de temperatura */
        this.specialFields = {
            temperature: ''
        };
    }

    render() {
        if (!this.container) {
            console.error('[SWITCH] Container não encontrado:', this.containerId);
            return;
        }

        console.log('[SWITCH] Renderizando formulário com', this.itemsConfig.length, 'itens');

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-server', 'SWITCH - Inspeção de Switch Industrial')}
                ${this.createSummaryCards()}
                <div id="switch-items-container"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('switch-items-container');
        if (!itemsContainer) {
            console.error('[SWITCH] Container de itens não encontrado');
            return;
        }

        // Limpar items array antes de renderizar
        this.items = [];

        this.itemsConfig.forEach(item => {
            let card;

            if (item.hasTemperature) {
                card = this._createTemperatureCard(item);
            } else {
                card = this.createStandardCard(item);
            }

            if (card) {
                itemsContainer.appendChild(card);
                this.items.push({
                    element: card,
                    number: item.number,
                    title: item.title,
                    status: null,
                    annotations: '',
                    hasTemperature: item.hasTemperature || false
                });
            }
        });

        console.log('[SWITCH] Cards renderizados:', this.items.length);
    }

    /**
     * Cria card especial para temperatura (Item 10)
     * @private
     */
    _createTemperatureCard(item) {
        const card = document.createElement('div');
        card.className = 'inspection-card';
        card.dataset.item = item.number;

        card.innerHTML = `
            <div class="card-header">
                <span class="card-number">ITEM ${String(item.number).padStart(2, '0')}</span>
                <span class="card-title">${escapeHtml(item.title)}</span>
            </div>
            <div class="card-body">
                ${item.description ? `<p class="card-description"><i class="fas fa-info-circle"></i> ${escapeHtml(item.description)}</p>` : ''}
                
                <!-- Campo de temperatura -->
                <div class="temperature-field">
                    <div class="temperature-input-wrapper">
                        <label for="switch-temperature">
                            <i class="fas fa-temperature-high"></i> Temperatura do Switch
                        </label>
                        <div class="temperature-input-group">
                            <input 
                                type="number" 
                                id="switch-temperature" 
                                class="temperature-input" 
                                placeholder="Ex: 45" 
                                data-temperature="switch"
                                min="0"
                                max="100"
                                step="0.1"
                                autocomplete="off"
                            >
                            <span class="temperature-unit">°C</span>
                        </div>
                        <div class="temperature-status" id="temperatureStatus">
                            <i class="fas fa-info-circle"></i>
                            <span>Padrão: ≤ 60°C</span>
                        </div>
                    </div>
                </div>

                <!-- Status OK/NOK -->
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

                <!-- Anotações -->
                <textarea 
                    class="annotation-field" 
                    placeholder="Anotações sobre a temperatura..." 
                    rows="3" 
                    data-item="${item.number}"
                    maxlength="${CONFIG.UI.maxAnnotationLength}"
                ></textarea>
            </div>
        `;

        return card;
    }

    attachEvents() {
        super.attachEvents();

        if (!this.container) return;

        // Evento para campo de temperatura
        const tempInput = this.container.querySelector('[data-temperature="switch"]');
        if (tempInput) {
            tempInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const statusEl = document.getElementById('temperatureStatus');
                
                if (statusEl) {
                    if (isNaN(value)) {
                        statusEl.innerHTML = '<i class="fas fa-info-circle"></i><span>Padrão: ≤ 60°C</span>';
                        statusEl.className = 'temperature-status';
                    } else if (value > 60) {
                        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Temperatura ALTA: ${value}°C (máx: 60°C)</span>`;
                        statusEl.className = 'temperature-status temperature-status--warning';
                    } else {
                        statusEl.innerHTML = `<i class="fas fa-check-circle"></i><span>Temperatura OK: ${value}°C</span>`;
                        statusEl.className = 'temperature-status temperature-status--ok';
                    }
                }

                this.specialFields.temperature = e.target.value;
                this.notifyObservers();
            });
        }
    }

    getData() {
        const data = super.getData();
        data.specialFields = { ...this.specialFields };
        return data;
    }

    loadData(data) {
        super.loadData(data);

        // Restaurar temperatura
        if (data?.specialFields?.temperature) {
            this.specialFields.temperature = data.specialFields.temperature;
            const input = this.container?.querySelector('[data-temperature="switch"]');
            if (input) {
                input.value = data.specialFields.temperature;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    reset() {
        super.reset();
        this.specialFields = { temperature: '' };
        
        const input = this.container?.querySelector('[data-temperature="switch"]');
        if (input) {
            input.value = '';
            const statusEl = document.getElementById('temperatureStatus');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-info-circle"></i><span>Padrão: ≤ 60°C</span>';
                statusEl.className = 'temperature-status';
            }
        }

        console.log('[SWITCH] Formulário resetado');
    }
}

// Inicialização
let switchForm = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        switchForm = new SwitchFormManager();
        switchForm.init();
        window.switchForm = switchForm;
        console.log('✅ [SWITCH] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [SWITCH] Erro ao inicializar:', error);
    }
});

window.SwitchFormManager = SwitchFormManager;