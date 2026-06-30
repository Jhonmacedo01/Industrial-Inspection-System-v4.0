/**
 * INSPECTION FORM v3.0.0
 * Formulário PLC (23 itens + LEDs + OZD)
 * @module plc-form
 */

class PLCFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-plc',
            formType: 'plc',
            items: [
                { number: 1, title: 'Inspecionar o local quanto às condições de segurança' },
                { number: 2, title: 'Avaliar as condições de limpeza interna e externa do painel' },
                { number: 3, title: 'Verificar a condição de uso do PLC', description: 'Impregnação, sujeira, pó, umidade, CPU/Cartões/Fonte/Rack sem identificação' },
                { number: 4, title: 'Verificar se o painel e o equipamento possuem TAG de identificação' },
                { number: 5, title: 'Verificar identificação TAG dos cabos', description: 'TAG de identificação dos equipamentos existentes e legíveis' },
                { 
                    number: 6, 
                    title: 'Avaliar as condições físicas do cabeamento do CLP', 
                    description: 'Organização dos cabos, eletrodutos, condutores, fibras ópticas, mau contato, aquecimento, corrosão' 
                },
                {
                    number: 7,
                    title: 'Verificar LEDs de falha',
                    description: 'Fontes, cartões de comunicação, cartões de I/O e bateria externa do controlador',
                    hasLeds: true,
                    measure: 'Caso o LED da bateria externa esteja apagado ou piscando, abrir nota para troca'
                },
                { number: 8, title: 'Verificar erro nas portas de comunicação', description: 'Cartões Ethernet, switches e demais dispositivos de rede' },
                {
                    number: 9,
                    title: 'Realizar avaliação das OZDs',
                    description: 'Canais CH2 e CH3 (fibra óptica). Se LEDs piscando vermelho/amarelo ou apagados, abrir nota',
                    hasOzd: true,
                    measure: 'Avaliar infraestrutura da rede se houver anomalia'
                },
                { number: 10, title: 'Verificar se os cartões estão com as travas de fixação', description: 'Travas dos barramentos e terminadores do controlador' },
                { number: 11, title: 'Verificar se o painel possui fechadura', description: 'Fechadura Rittal ou cadeado padrão em condições de uso' },
                { number: 12, title: 'Verificar iluminação do painel' },
                { number: 13, title: 'Verificar temperatura da sala elétrica', description: 'Ar-condicionado funcional quando aplicável' },
                { number: 14, title: 'Realizar avaliação visual das condições de fixação', description: 'Conexões e cartões, identificando folgas ou anomalias' },
                { number: 15, title: 'Verificar a vedação das portas do painel', description: 'Contra poeira e umidade' },
                { number: 16, title: 'Avaliar a integridade física da estrutura do painel', description: 'Furos, fixação, portas' },
                { number: 17, title: 'Verificar alimentação do painel e do rack' },
                { number: 18, title: 'Verificar e identificar pontos de calor', description: 'Termografia' },
                { 
                    number: 19, 
                    title: 'Verificar o aterramento do painel', 
                    description: 'Realizar medição com multímetro para confirmar ausência de tensão entre neutro e terra',
                    measure: 'Abrir nota corretiva caso anormalidade na medição' 
                },
                { 
                    number: 20, 
                    title: 'Verificar tensões de entrada e saída da fonte', 
                    description: 'Realizar medição com multímetro',
                    measure: 'Abrir nota corretiva caso anormalidade na medição' 
                },
                { number: 21, title: 'Registrar informações dos desvios na OM' },
                { 
                    number: 22, 
                    title: 'Abrir nota em caso de anormalidade', 
                    measure: 'Registrar as anomalias no Solicitação de Manutenção' 
                },
                { 
                    number: 23, 
                    title: 'Desmobilização e 5S', 
                    measure: 'Verificar limpeza do local / Certificar que todos os resíduos gerados foram devidamente descartados' 
                }
            ]
        });

        /** Campos de LEDs */
        this.leds = { fontes: null, comunicacao: null, io: null, bateria: null, ozd: null };
    }

    render() {
        if (!this.container) {
            console.error('[PLC] Container não encontrado:', this.containerId);
            return;
        }

        console.log('[PLC] Renderizando formulário com', this.itemsConfig.length, 'itens');

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-microchip', 'PLC - Controlador Lógico Programável')}
                ${this.createSummaryCards()}
                <div id="plc-items-container"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('plc-items-container');
        if (!itemsContainer) {
            console.error('[PLC] Container de itens não encontrado');
            return;
        }

        // Limpar items array antes de renderizar
        this.items = [];

        this.itemsConfig.forEach(item => {
            let card;

            if (item.hasLeds) {
                card = this._createLedsCard(item);
            } else if (item.hasOzd) {
                card = this._createOzdCard(item);
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
                    hasLeds: item.hasLeds || false,
                    hasOzd: item.hasOzd || false
                });
            }
        });

        console.log('[PLC] Cards renderizados:', this.items.length);
        
        // Log de itens especiais
        const ledsItems = this.items.filter(i => i.hasLeds);
        const ozdItems = this.items.filter(i => i.hasOzd);
        console.log(`[PLC] Itens com LEDs: ${ledsItems.length}, Itens com OZD: ${ozdItems.length}`);
    }

    /**
     * Cria card especial para LEDs (Item 7)
     * @private
     */
    _createLedsCard(item) {
        const card = document.createElement('div');
        card.className = 'inspection-card';
        card.dataset.item = item.number;

        card.innerHTML = `
            <div class="card-header">
                <span class="card-number">ITEM ${String(item.number).padStart(2, '0')}</span>
                <span class="card-title">${escapeHtml(item.title)}</span>
                ${item.measure ? `<span class="card-measure-badge"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(item.measure)}</span>` : ''}
            </div>
            <div class="card-body">
                ${item.description ? `<p class="card-description"><i class="fas fa-info-circle"></i> ${escapeHtml(item.description)}</p>` : ''}
                
                <!-- Painel de LEDs -->
                <div class="leds-panel">
                    <div class="leds-panel-title">
                        <i class="fas fa-lightbulb"></i> 
                        <span>Status dos LEDs de Falha</span>
                    </div>
                    <div class="leds-grid">
                        <!-- Fontes -->
                        <div class="led-row">
                            <div class="led-row-label">
                                <i class="fas fa-plug"></i> LEDs de Falha das Fontes
                            </div>
                            <div class="led-button-group" data-led="fontes">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK">
                                    <i class="fas fa-check"></i> OK
                                </button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK">
                                    <i class="fas fa-times"></i> NOK
                                </button>
                            </div>
                        </div>

                        <!-- Comunicação -->
                        <div class="led-row">
                            <div class="led-row-label">
                                <i class="fas fa-network-wired"></i> Cartões de Comunicação
                            </div>
                            <div class="led-button-group" data-led="comunicacao">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK">
                                    <i class="fas fa-check"></i> OK
                                </button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK">
                                    <i class="fas fa-times"></i> NOK
                                </button>
                            </div>
                        </div>

                        <!-- Cartões I/O -->
                        <div class="led-row">
                            <div class="led-row-label">
                                <i class="fas fa-microchip"></i> Cartões de I/O
                            </div>
                            <div class="led-button-group" data-led="io">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK">
                                    <i class="fas fa-check"></i> OK
                                </button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK">
                                    <i class="fas fa-times"></i> NOK
                                </button>
                            </div>
                        </div>

                        <!-- Bateria -->
                        <div class="led-row">
                            <div class="led-row-label">
                                <i class="fas fa-battery-full"></i> Bateria Externa
                            </div>
                            <div class="led-button-group" data-led="bateria">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK">
                                    <i class="fas fa-check"></i> OK
                                </button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK">
                                    <i class="fas fa-times"></i> NOK
                                </button>
                                <button type="button" class="led-btn led-btn--na" data-value="N/A">
                                    <i class="fas fa-minus"></i> N/A
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Anotações -->
                <textarea 
                    class="annotation-field" 
                    placeholder="Anotações sobre os LEDs (obrigatório se houver não conformidade)..." 
                    rows="3" 
                    data-item="${item.number}"
                    maxlength="${CONFIG.UI.maxAnnotationLength}"
                    style="margin-top: 1rem;"
                ></textarea>
            </div>
        `;

        return card;
    }

    /**
     * Cria card especial para OZD (Item 9)
     * @private
     */
    _createOzdCard(item) {
        const card = document.createElement('div');
        card.className = 'inspection-card';
        card.dataset.item = item.number;

        card.innerHTML = `
            <div class="card-header">
                <span class="card-number">ITEM ${String(item.number).padStart(2, '0')}</span>
                <span class="card-title">${escapeHtml(item.title)}</span>
                ${item.measure ? `<span class="card-measure-badge"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(item.measure)}</span>` : ''}
            </div>
            <div class="card-body">
                ${item.description ? `<p class="card-description"><i class="fas fa-info-circle"></i> ${escapeHtml(item.description)}</p>` : ''}
                
                <!-- Painel OZD -->
                <div class="leds-panel">
                    <div class="leds-panel-title">
                        <i class="fas fa-fiber"></i> 
                        <span>Avaliação OZD - Fibra Óptica</span>
                    </div>
                    <div class="leds-grid">
                        <div class="led-row">
                            <div class="led-row-label">
                                <i class="fas fa-chart-line"></i> Status Canais CH2 e CH3
                            </div>
                            <div class="led-button-group" data-led="ozd">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK">
                                    <i class="fas fa-check"></i> OK
                                </button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK">
                                    <i class="fas fa-times"></i> NOK
                                </button>
                                <button type="button" class="led-btn led-btn--na" data-value="N/A">
                                    <i class="fas fa-minus"></i> N/A
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Anotações -->
                <textarea 
                    class="annotation-field" 
                    placeholder="Anotações sobre a OZD (obrigatório se houver não conformidade)..." 
                    rows="3" 
                    data-item="${item.number}"
                    maxlength="${CONFIG.UI.maxAnnotationLength}"
                    style="margin-top: 1rem;"
                ></textarea>
            </div>
        `;

        return card;
    }

    attachEvents() {
        // Chamar o attachEvents da classe base primeiro
        super.attachEvents();

        if (!this.container) return;

        // Click nos botões LED/OZD
        this.container.addEventListener('click', (e) => {
            const ledBtn = e.target.closest('.led-btn');
            if (!ledBtn) return;

            e.preventDefault();
            e.stopPropagation();

            const buttonGroup = ledBtn.closest('.led-button-group');
            const ledField = buttonGroup?.dataset.led;
            const value = ledBtn.dataset.value;

            if (ledField && this.leds.hasOwnProperty(ledField)) {
                // Atualizar estado
                this.leds[ledField] = value;
                
                // Atualizar visual
                buttonGroup.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));
                ledBtn.classList.add('is-active');
                
                // Notificar
                this.notifyObservers();
                console.log(`[PLC] LED ${ledField} = ${value}`);
            }
        });
    }

    getData() {
        const data = super.getData();
        data.leds = { ...this.leds };
        return data;
    }

    loadData(data) {
        super.loadData(data);

        // Restaurar LEDs
        if (data?.leds) {
            this.leds = { ...data.leds };
            Object.entries(this.leds).forEach(([field, value]) => {
                if (!value) return;
                
                const btn = this.container?.querySelector(
                    `.led-button-group[data-led="${field}"] .led-btn[data-value="${value}"]`
                );
                if (btn) {
                    const group = btn.closest('.led-button-group');
                    group?.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));
                    btn.classList.add('is-active');
                }
            });
            console.log('[PLC] Dados de LEDs restaurados');
        }
    }

    reset() {
        super.reset();
        
        // Resetar LEDs
        this.leds = { fontes: null, comunicacao: null, io: null, bateria: null, ozd: null };
        
        // Limpar visual
        this.container?.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));

        console.log('[PLC] Formulário resetado');
    }

    updateSummary() {
        // Apenas itens regulares (sem LEDs e OZD)
        const regularItems = this.items.filter(i => !i.hasLeds && !i.hasOzd);
        const okCount = regularItems.filter(i => i.status === 'OK').length;
        const nokCount = regularItems.filter(i => i.status === 'NOK').length;

        this._setText(`${this.formType}-ok-count`, okCount);
        this._setText(`${this.formType}-nok-count`, nokCount);

        const badge = document.querySelector(`#tab-${this.formType} .tab-badge`);
        if (badge) {
            badge.textContent = nokCount > 0 ? nokCount : '0';
        }
    }
}

// Inicialização
let plcForm = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        plcForm = new PLCFormManager();
        plcForm.init();
        window.plcForm = plcForm;
        console.log('✅ [PLC] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [PLC] Erro ao inicializar:', error);
    }
});

window.PLCFormManager = PLCFormManager;