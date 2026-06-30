/**
 * INSPECTION FORM v3.1.0
 * Formulário PLC (23 itens) - COM CAPTURA CONTÍNUA DE FOTOS
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
                { number: 6, title: 'Avaliar as condições físicas do cabeamento do CLP', description: 'Organização dos cabos, eletrodutos, condutores, fibras ópticas, mau contato, aquecimento, corrosão' },
                { number: 7, title: 'Verificar LEDs de falha', description: 'Fontes, cartões de comunicação, cartões de I/O e bateria externa do controlador', hasLeds: true, measure: 'Caso o LED da bateria externa esteja apagado ou piscando, abrir nota para troca' },
                { number: 8, title: 'Verificar erro nas portas de comunicação', description: 'Cartões Ethernet, switches e demais dispositivos de rede' },
                { number: 9, title: 'Realizar avaliação das OZDs', description: 'Canais CH2 e CH3 (fibra óptica). Se LEDs piscando vermelho/amarelo ou apagados, abrir nota', hasOzd: true, measure: 'Avaliar infraestrutura da rede se houver anomalia' },
                { number: 10, title: 'Verificar se os cartões estão com as travas de fixação', description: 'Travas dos barramentos e terminadores do controlador' },
                { number: 11, title: 'Verificar se o painel possui fechadura', description: 'Fechadura Rittal ou cadeado padrão em condições de uso' },
                { number: 12, title: 'Verificar iluminação do painel' },
                { number: 13, title: 'Verificar temperatura da sala elétrica', description: 'Ar-condicionado funcional quando aplicável' },
                { number: 14, title: 'Realizar avaliação visual das condições de fixação', description: 'Conexões e cartões, identificando folgas ou anomalias' },
                { number: 15, title: 'Verificar a vedação das portas do painel', description: 'Contra poeira e umidade' },
                { number: 16, title: 'Avaliar a integridade física da estrutura do painel', description: 'Furos, fixação, portas' },
                { number: 17, title: 'Verificar alimentação do painel e do rack' },
                { number: 18, title: 'Verificar e identificar pontos de calor', description: 'Termografia' },
                { number: 19, title: 'Verificar o aterramento do painel', description: 'Realizar medição com multímetro para confirmar ausência de tensão entre neutro e terra', measure: 'Abrir nota corretiva caso anormalidade na medição' },
                { number: 20, title: 'Verificar tensões de entrada e saída da fonte', description: 'Realizar medição com multímetro', measure: 'Abrir nota corretiva caso anormalidade na medição' },
                { number: 21, title: 'Registrar informações dos desvios na OM' },
                { number: 22, title: 'Abrir nota em caso de anormalidade', measure: 'Registrar as anomalias no Solicitação de Manutenção' },
                { number: 23, title: 'Desmobilização e 5S', measure: 'Verificar limpeza do local / Certificar que todos os resíduos gerados foram devidamente descartados' }
            ]
        });

        /** Campos de LEDs */
        this.leds = { fontes: null, comunicacao: null, io: null, bateria: null, ozd: null };
        
        /** Manager de fotos do formulário */
        this.photoManager = null;
        this._photoRetryCount = 0;
        this._photoSetupTimers = [];
    }

    render() {
        this._log('📝 Renderizando formulário PLC...');
        
        if (!this.container) {
            this._error('Container não encontrado');
            return;
        }

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-microchip', 'PLC - Controlador Lógico Programável')}
                ${this.createSummaryCards()}
                <div id="plc-items-container"></div>
                <div id="plc-photo-upload" class="photo-upload-wrapper"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('plc-items-container');
        if (!itemsContainer) {
            this._error('Container de itens não encontrado');
            return;
        }

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

        this._log(`✅ ${this.items.length} itens renderizados`);
        this._schedulePhotoSetup();
    }

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
                <div class="leds-panel">
                    <div class="leds-panel-title"><i class="fas fa-lightbulb"></i> Status dos LEDs de Falha</div>
                    <div class="leds-grid">
                        <div class="led-row">
                            <div class="led-row-label"><i class="fas fa-plug"></i> LEDs de Falha das Fontes</div>
                            <div class="led-button-group" data-led="fontes">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK"><i class="fas fa-check"></i> OK</button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK"><i class="fas fa-times"></i> NOK</button>
                            </div>
                        </div>
                        <div class="led-row">
                            <div class="led-row-label"><i class="fas fa-network-wired"></i> Cartões de Comunicação</div>
                            <div class="led-button-group" data-led="comunicacao">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK"><i class="fas fa-check"></i> OK</button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK"><i class="fas fa-times"></i> NOK</button>
                            </div>
                        </div>
                        <div class="led-row">
                            <div class="led-row-label"><i class="fas fa-microchip"></i> Cartões de I/O</div>
                            <div class="led-button-group" data-led="io">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK"><i class="fas fa-check"></i> OK</button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK"><i class="fas fa-times"></i> NOK</button>
                            </div>
                        </div>
                        <div class="led-row">
                            <div class="led-row-label"><i class="fas fa-battery-full"></i> Bateria Externa</div>
                            <div class="led-button-group" data-led="bateria">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK"><i class="fas fa-check"></i> OK</button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK"><i class="fas fa-times"></i> NOK</button>
                                <button type="button" class="led-btn led-btn--na" data-value="N/A"><i class="fas fa-minus"></i> N/A</button>
                            </div>
                        </div>
                    </div>
                </div>
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
                <textarea class="annotation-field" placeholder="Anotações sobre os LEDs (obrigatório se houver não conformidade)..." rows="3" data-item="${item.number}" maxlength="${CONFIG.UI.maxAnnotationLength}" style="margin-top: 1rem;"></textarea>
            </div>
        `;
        return card;
    }

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
                <div class="leds-panel">
                    <div class="leds-panel-title"><i class="fas fa-fiber"></i> Avaliação OZD - Fibra Óptica</div>
                    <div class="leds-grid">
                        <div class="led-row">
                            <div class="led-row-label"><i class="fas fa-chart-line"></i> Status Canais CH2 e CH3</div>
                            <div class="led-button-group" data-led="ozd">
                                <button type="button" class="led-btn led-btn--ok" data-value="OK"><i class="fas fa-check"></i> OK</button>
                                <button type="button" class="led-btn led-btn--nok" data-value="NOK"><i class="fas fa-times"></i> NOK</button>
                                <button type="button" class="led-btn led-btn--na" data-value="N/A"><i class="fas fa-minus"></i> N/A</button>
                            </div>
                        </div>
                    </div>
                </div>
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
                <textarea class="annotation-field" placeholder="Anotações sobre a OZD (obrigatório se houver não conformidade)..." rows="3" data-item="${item.number}" maxlength="${CONFIG.UI.maxAnnotationLength}" style="margin-top: 1rem;"></textarea>
            </div>
        `;
        return card;
    }

    attachEvents() {
        super.attachEvents();
        if (!this.container) return;

        this.container.addEventListener('click', (e) => {
            const ledBtn = e.target.closest('.led-btn');
            if (!ledBtn) return;
            e.preventDefault();
            e.stopPropagation();

            const buttonGroup = ledBtn.closest('.led-button-group');
            const ledField = buttonGroup?.dataset.led;
            const value = ledBtn.dataset.value;

            if (ledField && this.leds.hasOwnProperty(ledField)) {
                this.leds[ledField] = value;
                buttonGroup.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));
                ledBtn.classList.add('is-active');
                this.notifyObservers();
                this._log(`💡 LED ${ledField} = ${value}`);
            }
        });

        this._log('✅ Eventos de LEDs configurados');
    }

    _schedulePhotoSetup() {
        this._log('📸 Agendando inicialização do módulo de fotos...');
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];

        const delays = [200, 500, 800, 1200, 1800, 2500, 3500, 5000];
        delays.forEach((delay, index) => {
            const timer = setTimeout(() => {
                this._log(`🔄 Tentativa ${index + 1}/${delays.length} para inicializar fotos...`);
                this._setupPhotoUpload();
            }, delay);
            this._photoSetupTimers.push(timer);
        });
    }

    _setupPhotoUpload() {
        this._photoRetryCount++;
        const containerId = 'plc-photo-upload';
        const container = document.getElementById(containerId);

        if (!container) {
            this._log(`⚠️ Container de fotos não encontrado (tentativa ${this._photoRetryCount})`);
            if (this._photoRetryCount < 8) {
                setTimeout(() => this._setupPhotoUpload(), 500);
            }
            return;
        }

        if (this.photoManager && this.photoManager.initialized) {
            this._log('✅ PhotoManager já inicializado');
            return;
        }

        if (window.PhotoCaptureManager) {
            try {
                this._log('🔄 Criando PhotoCaptureManager...');
                const manager = new PhotoCaptureManager({
                    containerId: containerId,
                    formType: this.formType,
                    maxPhotos: 40,
                    quality: 0.92,
                    maxWidth: 1920,
                    maxHeight: 1080,
                    debug: true
                });
                manager.init();

                if (window.zipExportManager) {
                    window.zipExportManager.registerPhotoManager(`${this.formType}_evidencias`, manager);
                    this._log('✅ Manager registrado no ZipExportManager');
                }

                if (window.App) {
                    window.App.state.photoManagers[this.formType] = manager;
                    this._log('✅ Manager registrado no App');
                }

                this.photoManager = manager;
                manager.onChange((photos) => {
                    this._log(`📷 ${photos.length} fotos no formulário ${this.formType}`);
                    this.notifyObservers();
                });

                this._log(`✅ PhotoManager configurado com sucesso (${manager.getCount()} fotos)`);
            } catch (error) {
                this._error('Erro ao configurar PhotoManager:', error);
            }
        } else {
            this._error('PhotoCaptureManager não disponível');
        }
    }

    setupPhoto() {
        if (this.photoManager && this.photoManager.initialized) {
            this._log('✅ PhotoManager já inicializado');
            return;
        }
        this._log('🔄 Forçando configuração de fotos...');
        this._setupPhotoUpload();
    }

    getData() {
        const data = super.getData();
        data.leds = { ...this.leds };
        // FOTOS REMOVIDAS para evitar duplicação no ZipExportManager
        return data;
    }

    loadData(data) {
        super.loadData(data);
        if (data?.leds) {
            this.leds = { ...data.leds };
            Object.entries(this.leds).forEach(([field, value]) => {
                if (!value) return;
                const btn = this.container?.querySelector(`.led-button-group[data-led="${field}"] .led-btn[data-value="${value}"]`);
                if (btn) {
                    const group = btn.closest('.led-button-group');
                    group?.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));
                    btn.classList.add('is-active');
                }
            });
            this._log('💡 Dados de LEDs restaurados');
        }
    }

    reset() {
        this._log('🔄 Resetando formulário PLC...');
        super.reset();
        this.leds = { fontes: null, comunicacao: null, io: null, bateria: null, ozd: null };
        this.container?.querySelectorAll('.led-btn').forEach(b => b.classList.remove('is-active'));

        if (this.photoManager && typeof this.photoManager.clearPhotos === 'function') {
            this.photoManager.clearPhotos();
            this._log('🗑️ Fotos removidas');
        }
        this._log('✅ PLC resetado com sucesso');
    }

    updateSummary() {
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

    destroy() {
        this._log('🧹 Destruindo formulário PLC...');
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];
        if (this.photoManager && typeof this.photoManager.destroy === 'function') {
            this.photoManager.destroy();
        }
        super.destroy();
        this._log('✅ PLC destruído');
    }
}

let plcForm = null;

const initPLC = () => {
    try {
        plcForm = new PLCFormManager();
        plcForm.init();
        window.plcForm = plcForm;
        console.log('✅ [PLC] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [PLC] Erro ao inicializar:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initPLC, 100);
});

window.PLCFormManager = PLCFormManager;