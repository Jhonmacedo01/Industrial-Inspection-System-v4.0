/**
 * INSPECTION FORM v3.1.0
 * Formulário CFTV (9 itens) - COM CAPTURA CONTÍNUA DE FOTOS
 * @module cftv-form
 */

class CFTVFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-cftv',
            formType: 'cftv',
            items: [
                { number: 1, title: 'Inspecionar estado de conservação do painel' },
                { number: 2, title: 'Verificar limpeza, conservação e fechadura' },
                { number: 3, title: 'Vedação das entradas e saídas do cabeamento' },
                {
                    number: 4,
                    title: 'Verificar se cabos e conectores estão íntegros',
                    description: 'Sem avarias, nem oxidação'
                },
                {
                    number: 5,
                    title: 'Verificar LEDs de status dos dispositivos',
                    description: 'Caso o painel esteja alimentado'
                },
                {
                    number: 6,
                    title: 'Verificar tubos e conduítes',
                    description: 'Que vão do painel para a sala elétrica'
                },
                {
                    number: 7,
                    title: 'Verificar suporte, fixação, limpeza das câmeras',
                    description: 'À distância'
                },
                {
                    number: 8,
                    title: 'Abrir nota em caso de anormalidade',
                    measure: 'Registrar as anomalias no Solicitação de Manutenção'
                },
                {
                    number: 9,
                    title: 'Desmobilização e 5S',
                    measure: 'Verificar limpeza do local / Certificar que todos os resíduos foram descartados'
                }
            ]
        });

        /** Manager de fotos do formulário */
        this.photoManager = null;
        this._photoRetryCount = 0;
        this._photoSetupTimers = [];
    }

    render() {
        this._log('📝 Renderizando formulário CFTV...');
        
        if (!this.container) {
            this._error('Container não encontrado');
            return;
        }

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-video', 'CFTV - Circuito Fechado de Televisão')}
                ${this.createSummaryCards()}
                <div id="cftv-items-container"></div>
                <div id="cftv-photo-upload" class="photo-upload-wrapper"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('cftv-items-container');
        if (!itemsContainer) {
            this._error('Container de itens não encontrado');
            return;
        }

        this.itemsConfig.forEach(item => {
            const card = this.createStandardCard(item);
            itemsContainer.appendChild(card);
            this.items.push({
                element: card,
                number: item.number,
                title: item.title,
                status: null,
                annotations: ''
            });
        });

        this._log(`✅ ${this.items.length} itens renderizados`);
        this._schedulePhotoSetup();
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
        const containerId = 'cftv-photo-upload';
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
        // FOTOS REMOVIDAS para evitar duplicação no ZipExportManager
        return data;
    }

    reset() {
        this._log('🔄 Resetando formulário CFTV...');
        super.reset();
        if (this.photoManager && typeof this.photoManager.clearPhotos === 'function') {
            this.photoManager.clearPhotos();
            this._log('🗑️ Fotos removidas');
        }
        this._log('✅ CFTV resetado com sucesso');
    }

    destroy() {
        this._log('🧹 Destruindo formulário CFTV...');
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];
        if (this.photoManager && typeof this.photoManager.destroy === 'function') {
            this.photoManager.destroy();
        }
        super.destroy();
        this._log('✅ CFTV destruído');
    }
}

let cftvForm = null;

const initCFTV = () => {
    try {
        cftvForm = new CFTVFormManager();
        cftvForm.init();
        window.cftvForm = cftvForm;
        console.log('✅ [CFTV] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [CFTV] Erro ao inicializar:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initCFTV, 100);
});

window.CFTVFormManager = CFTVFormManager;