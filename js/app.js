/**
 * INSPECTION FORM v3.1.0
 * Aplicação Principal (Orquestrador) - VERSÃO COMPLETA CORRIGIDA
 * @module app
 */

const App = {
    // ==========================================================================
    // ESTADO DA APLICAÇÃO
    // ==========================================================================

    state: {
        currentTab: 'gnss',
        isInitialized: false,
        progressIntervalId: null,
        fabMenuOpen: false,
        managersReady: false,
        photoManagers: {},
        photoInitAttempts: {},
        isMobile: false,
        cameraSupported: true,
        zipExportReady: false
    },

    managers: {},
    lastGlobalUpdate: 0,
    _initRetryTimer: null,
    _photoSetupTimers: [],
    _zipInitAttempts: 0,
    _maxZipInitAttempts: 10,

    // ==========================================================================
    // INICIALIZAÇÃO PRINCIPAL
    // ==========================================================================

    async init() {
        console.log(`🚀 Inicializando ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
        console.log(`📋 Sistemas: ${Object.values(CONFIG.SYSTEMS).map(s => s.name).join(', ')}`);
        console.log(`💡 Atalhos: Ctrl+S (Exportar) | Ctrl+Shift+R (Reset) | 1-5 (Abas) | Ctrl+H (Ajuda)`);
        console.log(`📸 Captura de fotos em alta resolução (até 4K)`);
        console.log(`📱 Dispositivo: ${this._detectDevice()}`);

        try {
            await this._waitForManagers();
            this._setupTabNavigation();
            this._setupFloatingActions();
            this._setupKeyboardShortcuts();
            this._setupGlobalProgress();
            this._setupModal();
            this._setupIdentificationPanel();
            this._addResetButton();
            this._connectAutoSave();
            this._setupGlobalDataSync();
            this._showWelcomeMessage();
            this._setupResponsiveAdjustments();
            this._detectCameraSupport();

            // Forçar inicialização das fotos com múltiplas tentativas
            this._schedulePhotoSetup();

            // Inicializar ZipExportManager
            this._initZipExportManager();

            this.state.isInitialized = true;
            console.log('✅ Aplicação inicializada com sucesso');
            
            setTimeout(() => this._autoRestoreSession(), 500);
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showToast('Erro ao inicializar. Recarregue a página.', 'error');
        }
    },

    // ==========================================================================
    // INICIALIZAÇÃO DO ZipExportManager
    // ==========================================================================

    _initZipExportManager() {
        console.log('📦 Inicializando ZipExportManager...');
        this._zipInitAttempts = 0;
        this._tryInitZipExport();
    },

    _tryInitZipExport() {
        this._zipInitAttempts++;
        
        try {
            // Verificar se já existe e está inicializado
            if (window.zipExportManager && window.zipExportManager.isInitialized && window.zipExportManager.isInitialized()) {
                console.log('✅ [App] ZipExportManager já inicializado');
                this.state.zipExportReady = true;
                return;
            }

            // Se o manager existe mas não está inicializado, tentar inicializar
            if (window.zipExportManager && typeof window.zipExportManager.init === 'function') {
                window.zipExportManager.init();
                if (window.zipExportManager.isInitialized && window.zipExportManager.isInitialized()) {
                    console.log('✅ [App] ZipExportManager inicializado via init()');
                    this.state.zipExportReady = true;
                    return;
                }
            }

            // Tentar criar nova instância
            if (typeof ZipExportManager !== 'undefined') {
                window.zipExportManager = new ZipExportManager();
                if (window.zipExportManager.isInitialized && window.zipExportManager.isInitialized()) {
                    console.log('✅ [App] ZipExportManager criado e inicializado');
                    this.state.zipExportReady = true;
                    
                    // Registrar os managers de fotos existentes
                    this._registerPhotoManagersWithZip();
                    return;
                }
            }

            // Se chegou aqui, não conseguiu inicializar
            console.warn(`⚠️ [App] ZipExportManager não inicializado (tentativa ${this._zipInitAttempts})`);
            
            if (this._zipInitAttempts < this._maxZipInitAttempts) {
                const delay = Math.min(500 * this._zipInitAttempts, 3000);
                setTimeout(() => this._tryInitZipExport(), delay);
            } else {
                console.error('❌ [App] Falha ao inicializar ZipExportManager após múltiplas tentativas');
                this.state.zipExportReady = false;
            }
        } catch (error) {
            console.error(`❌ [App] Erro ao inicializar ZipExportManager (tentativa ${this._zipInitAttempts}):`, error);
            
            if (this._zipInitAttempts < this._maxZipInitAttempts) {
                const delay = Math.min(500 * this._zipInitAttempts, 3000);
                setTimeout(() => this._tryInitZipExport(), delay);
            } else {
                this.state.zipExportReady = false;
            }
        }
    },

    _registerPhotoManagersWithZip() {
        if (!window.zipExportManager) return;
        
        Object.entries(this.state.photoManagers || {}).forEach(([type, manager]) => {
            if (manager && manager.initialized) {
                try {
                    window.zipExportManager.registerPhotoManager(`${type}_evidencias`, manager);
                    console.log(`✅ [App] Manager de fotos ${type} registrado no ZipExportManager`);
                } catch (error) {
                    console.warn(`⚠️ [App] Erro ao registrar ${type} no ZipExportManager:`, error);
                }
            }
        });
    },

    /**
     * Verifica se o ZipExportManager está disponível
     */
    _isZipExportReady() {
        return this.state.zipExportReady && window.zipExportManager && window.zipExportManager.isInitialized && window.zipExportManager.isInitialized();
    },

    /**
     * Força a inicialização do ZipExportManager
     */
    _forceZipExportInit() {
        if (this._isZipExportReady()) {
            return true;
        }
        
        console.log('🔄 [App] Forçando inicialização do ZipExportManager...');
        this._zipInitAttempts = 0;
        this._tryInitZipExport();
        
        // Tentar novamente após 500ms
        setTimeout(() => {
            if (!this._isZipExportReady()) {
                this._tryInitZipExport();
            }
        }, 500);
        
        return this._isZipExportReady();
    },

    // ==========================================================================
    // DETECÇÃO DE DISPOSITIVO E CÂMERA
    // ==========================================================================

    _detectDevice() {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
        this.state.isMobile = isMobile;
        return isMobile ? '📱 Mobile' : '💻 Desktop';
    },

    async _detectCameraSupport() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.state.cameraSupported = false;
                console.warn('⚠️ Câmera não suportada pelo navegador');
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(device => device.kind === 'videoinput');
            
            if (!hasCamera) {
                this.state.cameraSupported = false;
                console.warn('⚠️ Nenhuma câmera encontrada no dispositivo');
                this.showToast('📷 Nenhuma câmera encontrada. Use a galeria para adicionar fotos.', 'info', 4000);
            } else {
                this.state.cameraSupported = true;
                console.log(`✅ Câmera disponível (${devices.filter(d => d.kind === 'videoinput').length} dispositivo(s))`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao detectar câmera:', error);
            this.state.cameraSupported = false;
        }
    },

    // ==========================================================================
    // AGENDAMENTO DE INICIALIZAÇÃO DAS FOTOS
    // ==========================================================================

    _schedulePhotoSetup() {
        console.log('📸 Agendando inicialização dos módulos de foto...');
        
        if (this._initRetryTimer) {
            clearTimeout(this._initRetryTimer);
        }
        this._photoSetupTimers.forEach(t => clearTimeout(t));
        this._photoSetupTimers = [];

        setTimeout(() => this._forcePhotoSetup(), 100);
        this._photoSetupTimers.push(setTimeout(() => this._forcePhotoSetup(), 500));
        this._photoSetupTimers.push(setTimeout(() => this._forcePhotoSetup(), 1000));
        this._photoSetupTimers.push(setTimeout(() => this._forcePhotoSetup(), 2000));
        this._photoSetupTimers.push(setTimeout(() => this._forcePhotoSetup(), 3000));
        this._photoSetupTimers.push(setTimeout(() => {
            console.log('🔄 Tentativa final de inicialização das fotos...');
            this._forcePhotoSetup();
            this._checkPhotoInitStatus();
        }, 5000));
    },

    _forcePhotoSetup() {
        console.log('🔍 Verificando inicialização dos módulos de foto...');
        const formTypes = ['gnss', 'cftv', 'radio', 'plc', 'switch'];
        let successCount = 0;
        
        formTypes.forEach(type => {
            const manager = this.managers[type];
            if (!manager) {
                console.warn(`⚠️ Manager ${type} não disponível`);
                return;
            }

            if (!this.state.photoInitAttempts[type]) {
                this.state.photoInitAttempts[type] = 0;
            }
            this.state.photoInitAttempts[type]++;

            if (manager.photoManager && manager.photoManager.initialized) {
                console.log(`✅ PhotoManager já inicializado para ${type}`);
                successCount++;
                return;
            }

            const container = document.getElementById(`${type}-photo-upload`);
            if (!container) {
                console.warn(`⚠️ Container ${type}-photo-upload não encontrado (tentativa ${this.state.photoInitAttempts[type]})`);
                return;
            }

            try {
                let initialized = false;
                
                if (typeof manager.setupPhoto === 'function') {
                    manager.setupPhoto();
                    initialized = true;
                    console.log(`✅ setupPhoto chamado para ${type} (tentativa ${this.state.photoInitAttempts[type]})`);
                } else if (typeof manager._setupPhotoUpload === 'function') {
                    manager._setupPhotoUpload();
                    initialized = true;
                    console.log(`✅ _setupPhotoUpload chamado para ${type} (tentativa ${this.state.photoInitAttempts[type]})`);
                } else {
                    console.warn(`⚠️ Nenhum método de foto encontrado para ${type}`);
                }
                
                if (initialized) {
                    successCount++;
                }
            } catch (error) {
                console.error(`❌ Erro ao inicializar fotos para ${type}:`, error);
            }
        });

        if (successCount === formTypes.length) {
            console.log(`✅ Todos os ${formTypes.length} módulos de foto inicializados!`);
        } else {
            console.log(`ℹ️ ${successCount}/${formTypes.length} módulos de foto inicializados`);
        }
    },

    _checkPhotoInitStatus() {
        console.log('📊 Verificando status final dos módulos de foto...');
        const formTypes = ['gnss', 'cftv', 'radio', 'plc', 'switch'];
        let allInitialized = true;
        
        formTypes.forEach(type => {
            const manager = this.managers[type];
            if (manager) {
                const isInit = manager.photoManager && manager.photoManager.initialized;
                console.log(`  ${isInit ? '✅' : '❌'} ${type}: ${isInit ? 'Inicializado' : 'Não inicializado'}`);
                if (!isInit) allInitialized = false;
            }
        });

        if (!allInitialized) {
            console.log('⚠️ Alguns módulos de foto não foram inicializados. Verifique os logs acima.');
        }
    },

    // ==========================================================================
    // GESTÃO DE MANAGERS
    // ==========================================================================

    async _waitForManagers() {
        const requiredManagers = [
            'gnssForm', 'cftvForm', 'radioForm', 'plcForm', 'switchForm',
            'exportManager', 'autoSaveManager'
        ];
        const maxWait = 10000;
        const start = Date.now();

        console.log('⏳ Aguardando managers...');

        while (Date.now() - start < maxWait) {
            const allReady = requiredManagers.every(name => window[name]);
            if (allReady) {
                this.managers = {
                    gnss: window.gnssForm,
                    cftv: window.cftvForm,
                    radio: window.radioForm,
                    plc: window.plcForm,
                    switch: window.switchForm
                };
                
                Object.values(this.managers).forEach(manager => {
                    if (manager && typeof manager.addObserver === 'function') {
                        manager.addObserver(() => this._onFormDataChange());
                    }
                });
                
                this.state.managersReady = true;
                console.log('✅ Todos os managers prontos');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn('⚠️ Nem todos os managers ficaram prontos a tempo');
        this.state.managersReady = true;
    },

    // ==========================================================================
    // NAVEGAÇÃO POR ABAS
    // ==========================================================================

    _setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-button');
        const panels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (!tabId || tabId === this.state.currentTab) return;

                tabs.forEach(t => {
                    t.classList.remove('is-active');
                    t.setAttribute('aria-selected', 'false');
                    t.setAttribute('tabindex', '-1');
                });
                tab.classList.add('is-active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');

                panels.forEach(panel => panel.classList.remove('is-visible'));
                const targetPanel = document.getElementById(`panel-${tabId}`);
                if (targetPanel) targetPanel.classList.add('is-visible');

                this.state.currentTab = tabId;
                this.showToast(
                    `${CONFIG.SYSTEMS[tabId]?.name || tabId.toUpperCase()} ativado`,
                    'info',
                    1500
                );

                document.querySelector('.main-content')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                setTimeout(() => {
                    const manager = this.managers[tabId];
                    if (manager) {
                        if (typeof manager.setupPhoto === 'function') {
                            manager.setupPhoto();
                        } else if (typeof manager._setupPhotoUpload === 'function') {
                            manager._setupPhotoUpload();
                        }
                    }
                }, 300);
            });
        });

        console.log('✅ Navegação por abas configurada');
    },

    // ==========================================================================
    // PAINEL DE IDENTIFICAÇÃO (LOCAL, OM, TAG)
    // ==========================================================================

    _setupIdentificationPanel() {
        const toggle = document.getElementById('idPanelToggle');
        const panel = document.getElementById('identificationPanel');
        
        if (toggle && panel) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.toggle('is-collapsed');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.style.transform = panel.classList.contains('is-collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
                localStorage.setItem('inspform_panel_collapsed', panel.classList.contains('is-collapsed'));
            });
            
            const wasCollapsed = localStorage.getItem('inspform_panel_collapsed') === 'true';
            if (wasCollapsed) {
                panel.classList.add('is-collapsed');
                const icon = toggle.querySelector('i');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        }

        const idFields = [
            { id: 'globalLocal', field: 'local', label: 'LOCAL' },
            { id: 'globalOM', field: 'om', label: 'OM' },
            { id: 'globalTAG', field: 'tag', label: 'TAG' }
        ];

        idFields.forEach(({ id, field, label }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', debounce(() => {
                    this._saveIdentification();
                    this._syncGlobalDataToAllForms();
                    
                    if (element.value.trim()) {
                        element.classList.add('has-value');
                        this.showToast(`${label}: ${element.value}`, 'info', 1000);
                    } else {
                        element.classList.remove('has-value');
                    }
                }, 500));
                
                const saved = this._loadIdentification();
                if (saved && saved[field]) {
                    element.value = saved[field];
                    if (element.value.trim()) {
                        element.classList.add('has-value');
                    }
                }
                
                element.addEventListener('focus', () => {
                    element.parentElement?.classList.add('id-field--focused');
                });
                element.addEventListener('blur', () => {
                    element.parentElement?.classList.remove('id-field--focused');
                });
            }
        });
        
        const hasEmptyFields = idFields.some(({ id }) => {
            const el = document.getElementById(id);
            return !el || !el.value.trim();
        });
        
        if (hasEmptyFields && panel && !localStorage.getItem('inspform_panel_collapsed')) {
            panel.classList.remove('is-collapsed');
        }
        
        console.log('✅ Painel de identificação configurado (LOCAL, OM, TAG)');
    },

    _saveIdentification() {
        const data = {
            local: document.getElementById('globalLocal')?.value || '',
            om: document.getElementById('globalOM')?.value || '',
            tag: document.getElementById('globalTAG')?.value || '',
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('inspform_identification', JSON.stringify(data));
        
        const autoSaveIndicator = document.getElementById('autoSaveIndicator');
        if (autoSaveIndicator) {
            autoSaveIndicator.style.opacity = '0.7';
            setTimeout(() => {
                if (autoSaveIndicator) autoSaveIndicator.style.opacity = '1';
            }, 500);
        }
    },

    _loadIdentification() {
        try {
            const raw = localStorage.getItem('inspform_identification');
            if (raw) {
                const data = JSON.parse(raw);
                return {
                    local: data.local || '',
                    om: data.om || '',
                    tag: data.tag || ''
                };
            }
        } catch (e) {
            console.warn('Erro ao carregar identificação:', e);
        }
        return null;
    },

    _syncGlobalDataToAllForms() {
        const identification = this._loadIdentification();
        if (!identification) return;
        
        const event = new CustomEvent('globalDataUpdated', {
            detail: { identification, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        console.log('🔄 Dados globais sincronizados:', identification);
    },

    _setupGlobalDataSync() {
        window.addEventListener('globalDataUpdated', (e) => {
            const { identification } = e.detail;
            
            if (window.exportManager && window.exportManager.setIdentification) {
                window.exportManager.setIdentification(identification);
            }
            
            if (window.zipExportManager && window.zipExportManager.setIdentification) {
                window.zipExportManager.setIdentification(identification);
            }
            
            const sections = document.querySelectorAll('.section-heading');
            const hasAnyId = identification.local || identification.om || identification.tag;
            
            sections.forEach(section => {
                let badge = section.querySelector('.form-identification-badge');
                if (hasAnyId && identification.local) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'form-identification-badge';
                        section.appendChild(badge);
                    }
                    badge.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(identification.local)}`;
                } else if (badge) {
                    badge.remove();
                }
            });
        });
        
        setTimeout(() => this._syncGlobalDataToAllForms(), 100);
        console.log('✅ Sincronização global de dados configurada');
    },

    // ==========================================================================
    // BOTÕES FLUTUANTES (FAB) - COM VERIFICAÇÃO DO ZipExportManager
    // ==========================================================================

    _setupFloatingActions() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        
        if (!fabMain || !fabMenu) return;
        
        fabMain.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state.fabMenuOpen = !this.state.fabMenuOpen;
            fabMain.classList.toggle('is-open', this.state.fabMenuOpen);
            fabMenu.classList.toggle('is-open', this.state.fabMenuOpen);
            
            if (this.state.fabMenuOpen) {
                fabMain.setAttribute('aria-expanded', 'true');
            } else {
                fabMain.setAttribute('aria-expanded', 'false');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (this.state.fabMenuOpen && !fabMain.contains(e.target) && !fabMenu.contains(e.target)) {
                this.state.fabMenuOpen = false;
                fabMain.classList.remove('is-open');
                fabMenu.classList.remove('is-open');
                fabMain.setAttribute('aria-expanded', 'false');
            }
        });
        
        const actions = {
            'export-full': () => {
                if (window.exportManager) {
                    window.exportManager.downloadReport('full');
                } else {
                    this.showToast('⚠️ ExportManager não disponível', 'warning');
                }
            },
            'export-summary': () => {
                if (window.exportManager) {
                    window.exportManager.downloadReport('summary');
                } else {
                    this.showToast('⚠️ ExportManager não disponível', 'warning');
                }
            },
            'export-json': () => {
                if (window.exportManager) {
                    window.exportManager.downloadJSON();
                } else {
                    this.showToast('⚠️ ExportManager não disponível', 'warning');
                }
            },
            'export-zip': () => {
                // Verificar se o ZipExportManager está disponível
                if (!this._isZipExportReady()) {
                    this.showToast('⏳ Aguardando ZipExportManager...', 'info', 2000);
                    this._forceZipExportInit();
                    
                    // Tentar novamente após 1 segundo
                    setTimeout(() => {
                        if (this._isZipExportReady()) {
                            this._exportZipWithPhotos();
                        } else {
                            this.showToast('⚠️ ZipExportManager não disponível. Use o fallback.', 'warning', 3000);
                            // Fallback: baixar relatório TXT
                            this._exportZipFallback();
                        }
                    }, 1000);
                    return;
                }
                this._exportZipWithPhotos();
            },
            'export-gnss': () => this._downloadSingleForm('gnss', 'GNSS'),
            'export-cftv': () => this._downloadSingleForm('cftv', 'CFTV'),
            'export-radio': () => this._downloadSingleForm('radio', 'RÁDIO'),
            'export-plc': () => this._downloadSingleForm('plc', 'PLC'),
            'export-switch': () => this._downloadSingleForm('switch', 'SWITCH'),
            'save-session': () => this._saveAllFormsManually(),
            'load-session': () => this._restoreAllFormsManually(),
            'reset-all': () => this._confirmResetAll(),
            'shortcuts-help': () => this._openShortcutsModal()
        };
        
        document.querySelectorAll('[data-action]').forEach(btn => {
            const action = btn.dataset.action;
            if (actions[action]) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    actions[action]();
                    if (action !== 'shortcuts-help' && !action.startsWith('export-')) {
                        this.state.fabMenuOpen = false;
                        fabMain.classList.remove('is-open');
                        fabMenu.classList.remove('is-open');
                    }
                });
            }
        });

        console.log('✅ Botões flutuantes configurados');
    },

    // ==========================================================================
    // EXPORTAÇÃO ZIP COM VERIFICAÇÃO
    // ==========================================================================

    async _exportZipWithPhotos() {
        if (!this._isZipExportReady()) {
            this.showToast('⚠️ ZipExportManager não disponível', 'error', 3000);
            return;
        }

        const zipManager = window.zipExportManager;
        
        // Verificar se há fotos
        let totalPhotos = 0;
        Object.values(this.state.photoManagers || {}).forEach(manager => {
            if (manager && typeof manager.getCount === 'function') {
                totalPhotos += manager.getCount();
            }
        });

        console.log(`📦 Exportando ZIP com ${totalPhotos} fotos...`);

        if (totalPhotos === 0) {
            const confirm = window.confirm(
                '⚠️ Nenhuma foto adicionada. Deseja exportar o ZIP sem fotos?'
            );
            if (!confirm) return;
        }

        const toast = this.showToast('⏳ Gerando ZIP em alta qualidade...', 'info', 0);

        try {
            await zipManager.exportZip((progress) => {
                if (toast) {
                    const content = toast.querySelector('.toast-content');
                    if (content) {
                        content.textContent = `⏳ Gerando ZIP... ${Math.round(progress)}%`;
                    }
                }
            });

            if (toast) this._removeToast(toast);
            this.showToast(`✅ ZIP exportado com sucesso! (${totalPhotos} fotos em alta resolução)`, 'success', 4000);
            console.log('✅ ZIP exportado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao exportar ZIP:', error);
            if (toast) this._removeToast(toast);
            this.showToast('❌ Erro ao gerar ZIP. Tente novamente.', 'error', 4000);
            
            // Fallback: baixar relatório TXT
            this._exportZipFallback();
        }
    },

    /**
     * Fallback quando o ZIP não funciona - baixar apenas o TXT
     */
    _exportZipFallback() {
        console.log('📄 Usando fallback - baixando apenas relatório TXT');
        
        try {
            // Tentar usar o ZipExportManager para gerar o TXT
            if (window.zipExportManager && typeof window.zipExportManager.generateTXTReport === 'function') {
                const data = window.zipExportManager.collectAllData();
                if (data) {
                    const txtReport = window.zipExportManager.generateTXTReport(data);
                    const blob = new Blob([txtReport], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `relatorio_inspecao_${formatDateForFilename()}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    this.showToast('📄 Relatório TXT exportado com sucesso!', 'success', 3000);
                    return;
                }
            }
            
            // Fallback final: usar o exportManager
            if (window.exportManager) {
                window.exportManager.downloadReport('full');
                this.showToast('📄 Relatório exportado como alternativa', 'info', 3000);
            } else {
                this.showToast('❌ Nenhum método de exportação disponível', 'error', 3000);
            }
        } catch (error) {
            console.error('❌ Erro no fallback de exportação:', error);
            this.showToast('❌ Erro ao exportar. Tente novamente.', 'error', 4000);
        }
    },

    // ==========================================================================
    // DOWNLOAD DE FORMULÁRIO INDIVIDUAL
    // ==========================================================================

    _downloadSingleForm(formType, displayName) {
        if (!window.exportManager) {
            this.showToast('ExportManager não disponível', 'error');
            return;
        }
        
        const identification = this._loadIdentification();
        const manager = this.managers[formType];
        
        if (!manager) {
            this.showToast(`Formulário ${displayName} não encontrado`, 'error');
            return;
        }
        
        const data = manager.getData();
        
        const hasData = data.items && data.items.some(item => item.status);
        if (!hasData) {
            this.showToast(`Nenhum dado preenchido no formulário ${displayName}`, 'warning', 3000);
            return;
        }
        
        if (!identification.local && !identification.om && !identification.tag) {
            this.showToast('⚠️ Recomendado preencher LOCAL, OM e TAG antes de exportar', 'warning', 3000);
        }
        
        const now = new Date();
        const lines = [];
        
        lines.push('='.repeat(70));
        lines.push(`INSPECTION FORM v${CONFIG.VERSION} - RELATÓRIO ${displayName}`);
        lines.push('='.repeat(70));
        lines.push(`📅 Data: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
        lines.push('');
        
        lines.push('-'.repeat(52));
        lines.push('📋 DADOS DE IDENTIFICAÇÃO DA INSPEÇÃO');
        lines.push('-'.repeat(52));
        if (identification.local) lines.push(`📍 LOCAL: ${identification.local}`);
        if (identification.om) lines.push(`📄 OM: ${identification.om}`);
        if (identification.tag) lines.push(`🏷️ TAG: ${identification.tag}`);
        if (!identification.local && !identification.om && !identification.tag) {
            lines.push('⚠️ Nenhum dado de identificação preenchido');
        }
        lines.push('');
        
        lines.push('-'.repeat(52));
        lines.push(`📋 INSPEÇÃO - ${displayName}`);
        lines.push('-'.repeat(52));
        
        data.items.forEach(item => {
            if (item.status) {
                const statusIcon = item.status === 'OK' ? '✅' : '❌';
                lines.push(`${statusIcon} ITEM ${String(item.number).padStart(2, '0')}: ${item.title}`);
                lines.push(`   Status: ${item.status}`);
                if (item.annotations && item.annotations.trim()) {
                    lines.push(`   📝 Obs: ${item.annotations}`);
                }
                lines.push('');
            }
        });
        
        if (formType === 'radio' && data.alarms) {
            const metrics = [];
            if (data.alarms.ber) metrics.push(`BER: ${data.alarms.ber}`);
            if (data.alarms.rssi) metrics.push(`RSSI: ${data.alarms.rssi} dBm`);
            if (data.alarms.snr) metrics.push(`SNR: ${data.alarms.snr} dB`);
            if (data.alarms.throughput) metrics.push(`Throughput: ${data.alarms.throughput} Mbps`);
            if (metrics.length) {
                lines.push('📊 MÉTRICAS DE DESEMPENHO:');
                metrics.forEach(m => lines.push(`   • ${m}`));
                lines.push('');
            }
        }
        
        if (formType === 'plc' && data.leds) {
            const leds = [];
            if (data.leds.fontes) leds.push(`Fontes: ${data.leds.fontes}`);
            if (data.leds.comunicacao) leds.push(`Comunicação: ${data.leds.comunicacao}`);
            if (data.leds.io) leds.push(`I/O: ${data.leds.io}`);
            if (data.leds.bateria) leds.push(`Bateria: ${data.leds.bateria}`);
            if (data.leds.ozd) leds.push(`OZD: ${data.leds.ozd}`);
            if (leds.length) {
                lines.push('💡 STATUS DOS LEDs:');
                leds.forEach(l => lines.push(`   • ${l}`));
                lines.push('');
            }
        }
        
        if (formType === 'switch' && data.specialFields?.temperature) {
            const temp = data.specialFields.temperature;
            const tempStatus = parseFloat(temp) > 60 ? '⚠️ ALTA' : '✓ Normal';
            lines.push(`🌡️ TEMPERATURA: ${temp}°C (${tempStatus})`);
            lines.push('');
        }
        
        const okCount = data.items.filter(i => i.status === 'OK').length;
        const nokCount = data.items.filter(i => i.status === 'NOK').length;
        
        lines.push('-'.repeat(52));
        lines.push('📊 RESUMO DA INSPEÇÃO');
        lines.push('-'.repeat(52));
        lines.push(`✅ Itens CONFORMES: ${okCount}`);
        lines.push(`❌ Itens NÃO CONFORMES: ${nokCount}`);
        lines.push('');
        
        lines.push('='.repeat(70));
        lines.push(`🏁 FIM DO RELATÓRIO ${displayName}`);
        lines.push('='.repeat(70));
        
        const content = lines.join('\n');
        const filename = `inspecao_${formType}_${displayName.toLowerCase()}_${formatDateForFilename()}.txt`;
        
        this._downloadFile(content, filename, 'text/plain');
        this.showToast(`✅ Relatório ${displayName} exportado!`, 'success', 3000);
    },

    _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // ==========================================================================
    // SALVAR E RESTAURAR SESSÃO
    // ==========================================================================

    _saveAllFormsManually() {
        let savedCount = 0;
        
        Object.entries(this.managers).forEach(([type, manager]) => {
            if (manager && typeof manager.getData === 'function') {
                const data = manager.getData();
                if (window.autoSaveManager) {
                    window.autoSaveManager.save(type, data);
                    savedCount++;
                }
            }
        });
        
        this._saveIdentification();
        
        if (savedCount > 0) {
            this.showToast(`💾 ${savedCount} formulários salvos!`, 'success', 2000);
            console.log(`💾 ${savedCount} formulários salvos manualmente`);
        } else {
            this.showToast('ℹ️ Nenhum dado para salvar', 'info', 1500);
        }
    },

    _restoreAllFormsManually() {
        if (!window.autoSaveManager) {
            this.showToast('AutoSave não disponível', 'error');
            return;
        }
        
        const restored = window.autoSaveManager.restoreAll();
        
        if (restored === 0) {
            this.showToast('ℹ️ Nenhum dado salvo encontrado', 'info', 2000);
        } else {
            this._syncGlobalDataToAllForms();
            this.showToast(`📂 ${restored} formulários restaurados!`, 'success', 3000);
        }
    },

    _autoRestoreSession() {
        if (window.autoSaveManager && window.autoSaveManager.hasSavedData()) {
            setTimeout(() => {
                const shouldRestore = confirm('💾 Dados salvos encontrados. Deseja restaurar a sessão anterior?');
                if (shouldRestore) {
                    window.autoSaveManager.restoreAll();
                    this._syncGlobalDataToAllForms();
                    this.showToast('✅ Sessão restaurada com sucesso!', 'success', 3000);
                    console.log('📂 Sessão restaurada automaticamente');
                }
            }, 800);
        }
    },

    // ==========================================================================
    // RESET DE FORMULÁRIOS
    // ==========================================================================

    _confirmResetAll() {
        const confirmed = confirm(
            '⚠️ ATENÇÃO: Isso irá limpar TODOS os dados preenchidos em TODOS os formulários.\n\n' +
            '📋 Os campos LOCAL, OM e TAG também serão limpos.\n\n' +
            '📸 Todas as fotos adicionadas serão removidas.\n\n' +
            '❌ Esta ação não pode ser desfeita.\n\n' +
            'Deseja continuar?'
        );
        
        if (confirmed) {
            this.resetAllForms();
        }
    },

    resetAllForms() {
        let resetCount = 0;
        
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.reset === 'function') {
                manager.reset();
                resetCount++;
            }
        });
        
        const idFields = ['globalLocal', 'globalOM', 'globalTAG'];
        idFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('has-value');
            }
        });
        
        Object.values(this.state.photoManagers || {}).forEach(manager => {
            if (manager && typeof manager.clearPhotos === 'function') {
                manager.clearPhotos();
            }
        });
        
        if (window.autoSaveManager) {
            window.autoSaveManager.clearAll();
        }
        
        localStorage.removeItem('inspform_identification');
        
        this.showToast(`🗑️ ${resetCount} formulários resetados!`, 'success', 3000);
        this._updateGlobalProgress();
        
        console.log('🔴 Todos os formulários foram resetados (incluindo LOCAL, OM, TAG e fotos)');
    },

    // ==========================================================================
    // ATALHOS DE TECLADO
    // ==========================================================================

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (window.exportManager) {
                    window.exportManager.downloadReport('full');
                    this.showToast('📤 Exportando relatório...', 'info', 1000);
                } else {
                    this.showToast('⚠️ ExportManager não disponível', 'warning');
                }
            }

            if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
                e.preventDefault();
                this._confirmResetAll();
            }

            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this._openShortcutsModal();
            }

            if (e.key === 'Escape') {
                if (this.state.fabMenuOpen) {
                    this.state.fabMenuOpen = false;
                    const fabMain = document.getElementById('fabMain');
                    const fabMenu = document.getElementById('fabMenu');
                    if (fabMain) fabMain.classList.remove('is-open');
                    if (fabMenu) fabMenu.classList.remove('is-open');
                }
                this._closeModal();
            }

            if (!e.ctrlKey && !e.altKey && !e.metaKey &&
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 5) {
                    e.preventDefault();
                    const tabsMap = { 1: 'gnss', 2: 'cftv', 3: 'radio', 4: 'plc', 5: 'switch' };
                    const tab = document.querySelector(`.tab-button[data-tab="${tabsMap[num]}"]`);
                    if (tab) {
                        tab.click();
                        this.showToast(`🔢 Aba ${tabsMap[num].toUpperCase()}`, 'info', 800);
                    }
                }
            }
        });
        
        console.log('⌨️ Atalhos de teclado configurados');
    },

    // ==========================================================================
    // BARRA DE PROGRESSO GLOBAL
    // ==========================================================================

    _setupGlobalProgress() {
        this._updateGlobalProgress();
        
        if (this.state.progressIntervalId) {
            clearInterval(this.state.progressIntervalId);
        }
        this.state.progressIntervalId = setInterval(() => this._updateGlobalProgress(), 1000);
        
        console.log('📊 Barra de progresso global configurada');
    },

    _updateGlobalProgress() {
        let totalItems = 0;
        let completedItems = 0;
        
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.getData === 'function') {
                const data = manager.getData();
                if (data && data.items) {
                    data.items.forEach(item => {
                        if (item.status === 'OK' || item.status === 'NOK') {
                            completedItems++;
                        }
                    });
                    totalItems += data.items.length;
                }
            }
        });
        
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        const progressFill = document.getElementById('globalProgressFill');
        const progressLabel = document.getElementById('globalProgressLabel');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.setAttribute('aria-valuenow', Math.round(progress));
        }
        
        if (progressLabel) {
            progressLabel.textContent = `${Math.round(progress)}% preenchido (${completedItems}/${totalItems} itens)`;
        }
        
        return progress;
    },

    _onFormDataChange() {
        const now = Date.now();
        if (now - this.lastGlobalUpdate > 500) {
            this.lastGlobalUpdate = now;
            this._updateGlobalProgress();
        }
    },

    // ==========================================================================
    // AUTOSAVE
    // ==========================================================================

    _connectAutoSave() {
        if (!window.autoSaveManager) {
            console.warn('AutoSaveManager não disponível');
            return;
        }
        
        window.autoSaveManager.onSave((formType, data) => {
            console.log(`💾 AutoSave: ${formType} salvo`);
            const indicator = document.getElementById('autoSaveIndicator');
            if (indicator) {
                indicator.style.opacity = '0.5';
                setTimeout(() => {
                    if (indicator) indicator.style.opacity = '1';
                }, 300);
            }
        });
        
        window.autoSaveManager.onLoad((formType, data) => {
            console.log(`📂 AutoSave: ${formType} carregado`);
        });
        
        console.log('🔌 AutoSave conectado aos formulários');
    },

    // ==========================================================================
    // BOTÃO DE RESET
    // ==========================================================================

    _addResetButton() {
        if (document.querySelector('.reset-bar')) return;
        
        const resetBar = document.createElement('div');
        resetBar.className = 'reset-bar';
        resetBar.innerHTML = `
            <button class="btn-reset" id="globalResetBtn" title="Limpar todos os formulários (Ctrl+Shift+R)">
                <i class="fas fa-trash-alt"></i>
                <span>🗑️ Limpar Todos os Formulários</span>
            </button>
        `;
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent && mainContent.parentNode) {
            const progressWrapper = document.querySelector('.global-progress-wrapper');
            if (progressWrapper && progressWrapper.nextSibling) {
                progressWrapper.parentNode?.insertBefore(resetBar, progressWrapper.nextSibling);
            } else {
                mainContent.parentNode?.insertBefore(resetBar, mainContent);
            }
        }
        
        const resetBtn = document.getElementById('globalResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this._confirmResetAll());
        }
        
        console.log('🔄 Botão de reset adicionado');
    },

    // ==========================================================================
    // MODAL DE ATALHOS
    // ==========================================================================

    _setupModal() {
        const modal = document.getElementById('shortcutsModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const confirmBtn = modal?.querySelector('.modal-confirm');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._closeModal());
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this._closeModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this._closeModal();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
                this._closeModal();
            }
        });
        
        console.log('📋 Modal de atalhos configurado');
    },

    _openShortcutsModal() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
            if (firstFocusable) firstFocusable.focus();
        }
    },

    _closeModal() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    // ==========================================================================
    // RESPONSIVIDADE
    // ==========================================================================

    _setupResponsiveAdjustments() {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            const tabs = document.querySelectorAll('.tab-button');
            
            if (isMobile) {
                tabs.forEach(tab => {
                    const span = tab.querySelector('.tab-label');
                    if (span && !tab.hasAttribute('data-label-hidden')) {
                        span.style.display = 'none';
                        tab.setAttribute('data-label-hidden', 'true');
                    }
                });
            } else {
                tabs.forEach(tab => {
                    const span = tab.querySelector('.tab-label');
                    if (span && tab.getAttribute('data-label-hidden') === 'true') {
                        span.style.display = '';
                        tab.removeAttribute('data-label-hidden');
                    }
                });
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize();
        
        console.log('📱 Ajustes responsivos configurados');
    },

    // ==========================================================================
    // MENSAGENS E TOASTS
    // ==========================================================================

    _showWelcomeMessage() {
        setTimeout(() => {
            const deviceMsg = this.state.isMobile ? '📱 Modo mobile detectado' : '💻 Modo desktop';
            this.showToast(
                `👋 Bem-vindo ao ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION} | ${deviceMsg} | Preencha LOCAL, OM e TAG para identificar a inspeção`,
                'info',
                5000
            );
        }, 300);
    },

    showToast(message, type = 'info', duration = 4000) {
        const toastStack = document.getElementById('toastStack');
        if (!toastStack) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <div class="toast-content">${escapeHtml(message)}</div>
            <button class="toast-close" aria-label="Fechar">&times;</button>
        `;
        
        toastStack.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._removeToast(toast));
        }
        
        setTimeout(() => this._removeToast(toast), duration);
        
        return toast;
    },

    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('is-exiting');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    },

    // ==========================================================================
    // MÉTODOS DE UTILIDADE
    // ==========================================================================

    getPhotoManager(formType) {
        return this.state.photoManagers[formType] || null;
    },

    getAllPhotoManagers() {
        return { ...this.state.photoManagers };
    },

    getTotalPhotos() {
        let total = 0;
        Object.values(this.state.photoManagers || {}).forEach(manager => {
            if (manager && typeof manager.getCount === 'function') {
                total += manager.getCount();
            }
        });
        return total;
    },

    isPhotoManagerReady(formType) {
        const manager = this.state.photoManagers[formType];
        return manager && manager.initialized === true;
    }
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, iniciando aplicação...');
    setTimeout(() => App.init(), 100);
});

// Expor funções globalmente
window.showToast = (message, type, duration) => App.showToast(message, type, duration);
window.App = App;
window.getPhotoManager = (formType) => App.getPhotoManager(formType);
window.getAllPhotoManagers = () => App.getAllPhotoManagers();
window.getTotalPhotos = () => App.getTotalPhotos();

console.log('✅ App carregado. Versão:', CONFIG.VERSION);
console.log('📚 Sistemas disponíveis:', Object.keys(CONFIG.SYSTEMS).join(', '));