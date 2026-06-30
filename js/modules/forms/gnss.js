/**
 * INSPECTION FORM v3.1.0
 * Formulário GNSS (10 itens) - COM CAPTURA CONTÍNUA DE FOTOS
 * @module gnss-form
 */

class GNSSFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-gnss',
            formType: 'gnss',
            items: [
                {
                    number: 1,
                    title: 'Inspecionar estado de conservação do painel',
                    description: 'Verificar limpeza, conservação e iluminação'
                },
                {
                    number: 2,
                    title: 'Inspecionar a fechadura',
                    description: 'Verificar a vedação das entradas e saídas do cabeamento'
                },
                {
                    number: 3,
                    title: 'Inspecionar cabos e conexões',
                    description: 'Verificar se os cabos e conectores estão íntegros'
                },
                {
                    number: 4,
                    title: 'Inspecionar dispositivos',
                    description: 'Verificar a fixação do módulo'
                },
                {
                    number: 5,
                    title: 'Verificar LEDs e status dos dispositivos',
                    description: 'Caso o painel esteja alimentado'
                },
                {
                    number: 6,
                    title: 'Inspecionar tubos e conduítes',
                    description: 'Verificar os que vão do painel para a sala elétrica'
                },
                {
                    number: 7,
                    title: 'Inspecionar antenas à distância',
                    description: 'Verificar suporte, fixação, limpeza e conservação'
                },
                { number: 8, title: 'Registrar informações dos desvios na OM' },
                {
                    number: 9,
                    title: 'Abrir nota em caso de anormalidade',
                    measure: 'Registrar as anomalias no Solicitação de Manutenção'
                },
                {
                    number: 10,
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
        this._log('📝 Renderizando formulário GNSS...');
        
        if (!this.container) {
            this._error('Container não encontrado');
            return;
        }

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-satellite-dish', 'GNSS - Sistema de Navegação Global por Satélite')}
                ${this.createSummaryCards()}
                <div id="gnss-items-container"></div>
                <div id="gnss-photo-upload" class="photo-upload-wrapper"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('gnss-items-container');
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

    /**
     * Agenda a inicialização das fotos com múltiplas tentativas
     */
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

    /**
     * Configura o upload de fotos - chamado automaticamente
     */
    _setupPhotoUpload() {
        this._photoRetryCount++;
        const containerId = 'gnss-photo-upload';
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

    /**
     * Método chamado pelo App para forçar a configuração das fotos
     */
    setupPhoto() {
        if (this.photoManager && this.photoManager.initialized) {
            this._log('✅ PhotoManager já inicializado');
            return;
        }
        this._log('🔄 Forçando configuração de fotos...');
        this._setupPhotoUpload();
    }

    /**
     * Retorna os dados do formulário - SEM FOTOS (evita duplicação no ZIP)
     */
    getData() {
        const data = super.getData();
        // FOTOS REMOVIDAS para evitar duplicação no ZipExportManager
        // As fotos são coletadas diretamente pelo ZipExportManager via photoManagers
        return data;
    }

    /**
     * Reseta o formulário
     */
    reset() {
        this._log('🔄 Resetando formulário GNSS...');
        super.reset();
        
        if (this.photoManager && typeof this.photoManager.clearPhotos === 'function') {
            this.photoManager.clearPhotos();
            this._log('🗑️ Fotos removidas');
        }
        
        this._log('✅ GNSS resetado com sucesso');
    }

    /**
     * Destroi o formulário
     */
    destroy() {
        this._log('🧹 Destruindo formulário GNSS...');
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];
        if (this.photoManager && typeof this.photoManager.destroy === 'function') {
            this.photoManager.destroy();
        }
        super.destroy();
        this._log('✅ GNSS destruído');
    }
}

// Inicialização
let gnssForm = null;

const initGNSS = () => {
    try {
        gnssForm = new GNSSFormManager();
        gnssForm.init();
        window.gnssForm = gnssForm;
        console.log('✅ [GNSS] Formulário inicializado com sucesso');
    } catch (error) {
        console.error('❌ [GNSS] Erro ao inicializar:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initGNSS, 100);
});

window.GNSSFormManager = GNSSFormManager;