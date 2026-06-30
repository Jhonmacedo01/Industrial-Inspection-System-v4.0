/**
 * INSPECTION FORM v3.1.0
 * Formulário RÁDIO (8 itens + métricas) - COM CAPTURA CONTÍNUA DE FOTOS
 * @module radio-form
 */

class RadioFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-radio',
            formType: 'radio',
            items: [
                { number: 1, title: 'Verificar condições internas e externas' },
                { number: 2, title: 'Verificar cabos de alimentação', description: 'Integridade e fixação dos cabos' },
                { number: 3, title: 'Verificar estado físico da fonte de alimentação' },
                { number: 4, title: 'Verificar condições físicas do rádio', description: 'Fixação, limpeza e conservação' },
                { number: 5, title: 'Verificar LED de status', description: 'Deverá estar na cor VERDE' },
                { number: 6, title: 'Verificar presença de alarmes', description: 'BER, Nível de RSSI, S/N, Throughput', hasAlarms: true },
                { number: 7, title: 'Abrir nota em caso de anormalidade', measure: 'Registrar as anomalias no Solicitação de Manutenção' },
                { number: 8, title: 'Desmobilização e 5S', measure: 'Verificar limpeza do local / Certificar que todos os resíduos gerados foram devidamente descartados' }
            ]
        });

        /** Campos de alarme */
        this.alarms = { ber: '', rssi: '', snr: '', throughput: '' };
        
        /** Manager de fotos do formulário */
        this.photoManager = null;
        this._photoRetryCount = 0;
        this._photoSetupTimers = [];
    }

    render() {
        this._log('📝 Renderizando formulário Rádio...');
        
        if (!this.container) {
            this._error('Container não encontrado');
            return;
        }

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-broadcast-tower', 'Rádio - Comunicação Digital')}
                ${this.createSummaryCards()}
                <div id="radio-items-container"></div>
                <div id="radio-photo-upload" class="photo-upload-wrapper"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('radio-items-container');
        if (!itemsContainer) {
            this._error('Container de itens não encontrado');
            return;
        }

        this.items = [];

        this.itemsConfig.forEach(item => {
            let card;
            if (item.hasAlarms) {
                card = this._createAlarmCard(item);
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
                    hasAlarms: item.hasAlarms || false
                });
            }
        });

        this._log(`✅ ${this.items.length} itens renderizados`);
        this._schedulePhotoSetup();
    }

    _createAlarmCard(item) {
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
                <div class="radio-metrics-panel">
                    <div class="radio-metrics-title">
                        <i class="fas fa-chart-line"></i>
                        <span>Métricas de Desempenho do Rádio</span>
                    </div>
                    <div class="radio-metrics-grid">
                        <div class="radio-metric">
                            <label for="radio-ber"><i class="fas fa-wave-square"></i> BER (Bit Error Rate)</label>
                            <input type="text" id="radio-ber" class="alarm-input" placeholder="Ex: 0.0001" data-alarm="ber" autocomplete="off">
                            <div class="metric-hint">Valor entre 0 e 1 · Ideal &lt; 0.001</div>
                        </div>
                        <div class="radio-metric">
                            <label for="radio-rssi"><i class="fas fa-signal"></i> RSSI (dBm)</label>
                            <input type="text" id="radio-rssi" class="alarm-input" placeholder="Ex: -65" data-alarm="rssi" autocomplete="off">
                            <div class="metric-hint">Ideal &gt; -70 dBm</div>
                        </div>
                        <div class="radio-metric">
                            <label for="radio-snr"><i class="fas fa-chart-simple"></i> SNR / S/N (dB)</label>
                            <input type="text" id="radio-snr" class="alarm-input" placeholder="Ex: 25" data-alarm="snr" autocomplete="off">
                            <div class="metric-hint">Ideal &gt; 20 dB</div>
                        </div>
                        <div class="radio-metric">
                            <label for="radio-throughput"><i class="fas fa-gauge-high"></i> Throughput (Mbps)</label>
                            <input type="text" id="radio-throughput" class="alarm-input" placeholder="Ex: 100" data-alarm="throughput" autocomplete="off">
                            <div class="metric-hint">Taxa de transferência do link</div>
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
                <textarea class="annotation-field" placeholder="Anotações sobre os alarmes e métricas..." rows="3" data-item="${item.number}" maxlength="${CONFIG.UI.maxAnnotationLength}" style="margin-top: 1rem;"></textarea>
            </div>
        `;
        return card;
    }

    attachEvents() {
        super.attachEvents();
        if (!this.container) return;

        this.container.addEventListener('input', (e) => {
            const alarmField = e.target.dataset.alarm;
            if (alarmField && this.alarms.hasOwnProperty(alarmField)) {
                this.alarms[alarmField] = e.target.value;
                this._validateAlarmField(alarmField, e.target.value, e.target);
                this.notifyObservers();
                this._log(`📊 ${alarmField} = ${e.target.value}`);
            }
        });

        this.container.addEventListener('change', (e) => {
            const alarmField = e.target.dataset.alarm;
            if (alarmField && this.alarms.hasOwnProperty(alarmField)) {
                this._validateAlarmField(alarmField, e.target.value, e.target);
            }
        });

        this._log('✅ Eventos de alarme configurados');
    }

    _validateAlarmField(field, value, input) {
        input.classList.remove('is-valid', 'is-warning', 'is-error');
        if (!value || value.trim() === '') return;

        const num = parseFloat(value);
        const { VALIDATION } = CONFIG;

        switch (field) {
            case 'ber':
                if (isNaN(num) || num < VALIDATION.berMin || num > VALIDATION.berMax) {
                    input.classList.add('is-error');
                } else if (num > VALIDATION.berWarnThreshold) {
                    input.classList.add('is-warning');
                } else {
                    input.classList.add('is-valid');
                }
                break;
            case 'rssi':
                if (isNaN(num) || num < VALIDATION.rssiMin || num > VALIDATION.rssiMax) {
                    input.classList.add('is-error');
                } else if (num < VALIDATION.rssiWarnThreshold) {
                    input.classList.add('is-warning');
                } else {
                    input.classList.add('is-valid');
                }
                break;
            case 'snr':
                if (isNaN(num) || num < VALIDATION.snrMin || num > VALIDATION.snrMax) {
                    input.classList.add('is-error');
                } else if (num < VALIDATION.snrWarnThreshold) {
                    input.classList.add('is-warning');
                } else {
                    input.classList.add('is-valid');
                }
                break;
            case 'throughput':
                if (isNaN(num) || num < 0) {
                    input.classList.add('is-error');
                } else {
                    input.classList.add('is-valid');
                }
                break;
        }
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
        const containerId = 'radio-photo-upload';
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
        data.alarms = { ...this.alarms };
        // FOTOS REMOVIDAS para evitar duplicação no ZipExportManager
        return data;
    }

    loadData(data) {
        super.loadData(data);
        if (data?.alarms) {
            this.alarms = { ...data.alarms };
            Object.entries(this.alarms).forEach(([field, value]) => {
                const input = this.container?.querySelector(`[data-alarm="${field}"]`);
                if (input && value) {
                    input.value = value;
                    this._validateAlarmField(field, value, input);
                }
            });
            this._log('📊 Dados de alarme restaurados');
        }
    }

    reset() {
        this._log('🔄 Resetando formulário Rádio...');
        super.reset();
        this.alarms = { ber: '', rssi: '', snr: '', throughput: '' };
        ['ber', 'rssi', 'snr', 'throughput'].forEach(field => {
            const input = this.container?.querySelector(`[data-alarm="${field}"]`);
            if (input) {
                input.value = '';
                input.classList.remove('is-valid', 'is-warning', 'is-error');
            }
        });

        if (this.photoManager && typeof this.photoManager.clearPhotos === 'function') {
            this.photoManager.clearPhotos();
            this._log('🗑️ Fotos removidas');
        }
        this._log('✅ Rádio resetado com sucesso');
    }

    updateSummary() {
        const regularItems = this.items.filter(i => !i.hasAlarms);
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
        this._log('🧹 Destruindo formulário Rádio...');
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];
        if (this.photoManager && typeof this.photoManager.destroy === 'function') {
            this.photoManager.destroy();
        }
        super.destroy();
        this._log('✅ Rádio destruído');
    }
}

let radioForm = null;

const initRadio = () => {
    try {
        radioForm = new RadioFormManager();
        radioForm.init();
        window.radioForm = radioForm;
        console.log('✅ [Rádio] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [Rádio] Erro ao inicializar:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRadio, 100);
});

window.RadioFormManager = RadioFormManager;