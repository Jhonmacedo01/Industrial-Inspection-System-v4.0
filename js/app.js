/**
 * INSPECTION FORM v3.1.0
 * Aplicação Principal (Orquestrador) - VERSÃO COMPLETA COM LOCAL, OM, TAG
 * @module app
 */

const App = {
    /** Estado da aplicação */
    state: {
        currentTab: 'gnss',
        isInitialized: false,
        progressIntervalId: null,
        fabMenuOpen: false,
        managersReady: false
    },

    /** Referências aos managers */
    managers: {},

    /** Tempo da última atualização global */
    lastGlobalUpdate: 0,

    /**
     * Inicializa a aplicação
     */
    async init() {
        console.log(`🚀 Inicializando ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
        console.log(`📋 Sistemas: ${Object.values(CONFIG.SYSTEMS).map(s => s.name).join(', ')}`);
        console.log(`💡 Atalhos: Ctrl+S (Exportar) | Ctrl+Shift+R (Reset) | 1-5 (Abas) | Ctrl+H (Ajuda)`);
        console.log(`📋 Campos globais: LOCAL, OM, TAG disponíveis em todos os formulários`);

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

            this.state.isInitialized = true;
            console.log('✅ Aplicação inicializada com sucesso');
            
            // Tentar restaurar sessão automaticamente
            setTimeout(() => this._autoRestoreSession(), 500);
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showToast('Erro ao inicializar. Recarregue a página.', 'error');
        }
    },

    /**
     * Aguarda todos os managers estarem disponíveis
     */
    async _waitForManagers() {
        const requiredManagers = ['gnssForm', 'cftvForm', 'radioForm', 'plcForm', 'switchForm', 'exportManager', 'autoSaveManager'];
        const maxWait = 8000;
        const start = Date.now();

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
                
                // Registrar observers para cada manager
                Object.values(this.managers).forEach(manager => {
                    if (manager && typeof manager.addObserver === 'function') {
                        manager.addObserver(() => this._onFormDataChange());
                    }
                });
                
                this.state.managersReady = true;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn('⚠️ Nem todos os managers ficaram prontos a tempo');
        this.state.managersReady = true;
    },

    /**
     * Configura navegação por abas
     */
    _setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-button');
        const panels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (!tabId || tabId === this.state.currentTab) return;

                // Atualizar abas
                tabs.forEach(t => {
                    t.classList.remove('is-active');
                    t.setAttribute('aria-selected', 'false');
                    t.setAttribute('tabindex', '-1');
                });
                tab.classList.add('is-active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');

                // Atualizar painéis
                panels.forEach(panel => panel.classList.remove('is-visible'));
                const targetPanel = document.getElementById(`panel-${tabId}`);
                if (targetPanel) targetPanel.classList.add('is-visible');

                this.state.currentTab = tabId;
                this.showToast(
                    `${CONFIG.SYSTEMS[tabId]?.name || tabId.toUpperCase()} ativado`,
                    'info',
                    1500
                );

                // Scroll suave
                document.querySelector('.main-content')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        });
    },

    /**
     * Configura painel de identificação GLOBAL (LOCAL, OM, TAG)
     */
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
                // Salvar estado do painel
                localStorage.setItem('inspform_panel_collapsed', panel.classList.contains('is-collapsed'));
            });
            
            // Restaurar estado do painel
            const wasCollapsed = localStorage.getItem('inspform_panel_collapsed') === 'true';
            if (wasCollapsed) {
                panel.classList.add('is-collapsed');
                const icon = toggle.querySelector('i');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        }

        // Configurar campos de identificação global
        const idFields = [
            { id: 'globalLocal', field: 'local', label: 'LOCAL' },
            { id: 'globalOM', field: 'om', label: 'OM' },
            { id: 'globalTAG', field: 'tag', label: 'TAG' }
        ];

        idFields.forEach(({ id, field, label }) => {
            const element = document.getElementById(id);
            if (element) {
                // Evento para salvar
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
                
                // Restaurar valor salvo
                const saved = this._loadIdentification();
                if (saved && saved[field]) {
                    element.value = saved[field];
                    if (element.value.trim()) {
                        element.classList.add('has-value');
                    }
                }
                
                // Indicador Visual de preenchido
                element.addEventListener('focus', () => {
                    element.parentElement?.classList.add('id-field--focused');
                });
                element.addEventListener('blur', () => {
                    element.parentElement?.classList.remove('id-field--focused');
                });
            }
        });
        
        // Expandir painel se algum campo estiver vazio
        const hasEmptyFields = idFields.some(({ id }) => {
            const el = document.getElementById(id);
            return !el || !el.value.trim();
        });
        
        if (hasEmptyFields && panel && !localStorage.getItem('inspform_panel_collapsed')) {
            panel.classList.remove('is-collapsed');
        }
        
        console.log('✅ Painel de identificação configurado (LOCAL, OM, TAG)');
    },

    /**
     * Salva identificação no localStorage
     */
    _saveIdentification() {
        const data = {
            local: document.getElementById('globalLocal')?.value || '',
            om: document.getElementById('globalOM')?.value || '',
            tag: document.getElementById('globalTAG')?.value || '',
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('inspform_identification', JSON.stringify(data));
        
        // Atualizar indicador visual
        const autoSaveIndicator = document.getElementById('autoSaveIndicator');
        if (autoSaveIndicator) {
            autoSaveIndicator.style.opacity = '0.7';
            setTimeout(() => {
                if (autoSaveIndicator) autoSaveIndicator.style.opacity = '1';
            }, 500);
        }
    },

    /**
     * Carrega identificação do localStorage
     */
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

    /**
     * Sincroniza dados globais (LOCAL, OM, TAG) para todos os formulários
     */
    _syncGlobalDataToAllForms() {
        const identification = this._loadIdentification();
        if (!identification) return;
        
        const event = new CustomEvent('globalDataUpdated', {
            detail: { identification, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        console.log('🔄 Dados globais sincronizados:', identification);
    },

    /**
     * Configura sincronização global de dados entre formulários
     */
    _setupGlobalDataSync() {
        window.addEventListener('globalDataUpdated', (e) => {
            const { identification } = e.detail;
            
            // Atualizar campos nos reports (exportação)
            if (window.exportManager && window.exportManager.setIdentification) {
                window.exportManager.setIdentification(identification);
            }
            
            // Atualizar badge de identificação nos headers das seções
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
        
        // Disparar sincronização inicial
        setTimeout(() => this._syncGlobalDataToAllForms(), 100);
    },

    /**
     * Configura botão flutuante de ações (FAB)
     */
    _setupFloatingActions() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        
        if (!fabMain || !fabMenu) return;
        
        // Toggle do menu
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
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.state.fabMenuOpen && !fabMain.contains(e.target) && !fabMenu.contains(e.target)) {
                this.state.fabMenuOpen = false;
                fabMain.classList.remove('is-open');
                fabMenu.classList.remove('is-open');
                fabMain.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Ações do menu (incluindo exportações individuais)
        const actions = {
            'export-full': () => window.exportManager?.downloadReport('full'),
            'export-summary': () => window.exportManager?.downloadReport('summary'),
            'export-json': () => window.exportManager?.downloadJSON(),
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
    },

    /**
     * Download de um único formulário
     */
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
        
        // Verificar se há dados preenchidos
        const hasData = data.items && data.items.some(item => item.status);
        if (!hasData) {
            this.showToast(`Nenhum dado preenchido no formulário ${displayName}`, 'warning', 3000);
            return;
        }
        
        // Verificar identificação
        if (!identification.local && !identification.om && !identification.tag) {
            this.showToast('⚠️ Recomendado preencher LOCAL, OM e TAG antes de exportar', 'warning', 3000);
        }
        
        // Gerar conteúdo individual
        const now = new Date();
        const lines = [];
        
        lines.push('='.repeat(70));
        lines.push(`INSPECTION FORM v${CONFIG.VERSION} - RELATÓRIO ${displayName}`);
        lines.push('='.repeat(70));
        lines.push(`📅 Data: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
        lines.push('');
        
        // Adicionar identificação LOCAL, OM, TAG
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
        
        // Itens do formulário
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
        
        // Dados especiais (Rádio)
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
        
        // Dados especiais (PLC LEDs)
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
        
        // Dados especiais (Switch Temperatura)
        if (formType === 'switch' && data.specialFields?.temperature) {
            const temp = data.specialFields.temperature;
            const tempStatus = parseFloat(temp) > 60 ? '⚠️ ALTA' : '✓ Normal';
            lines.push(`🌡️ TEMPERATURA: ${temp}°C (${tempStatus})`);
            lines.push('');
        }
        
        // Resumo
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
        this.showToast(`Relatório ${displayName} exportado!`, 'success', 3000);
    },
    
    /**
     * Download de arquivo
     */
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

    /**
     * Salva todos os formulários manualmente
     */
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
            this.showToast(`${savedCount} formulários salvos!`, 'success', 2000);
        } else {
            this.showToast('Nenhum dado para salvar', 'info', 1500);
        }
    },

    /**
     * Restaura todos os formulários manualmente
     */
    _restoreAllFormsManually() {
        if (!window.autoSaveManager) {
            this.showToast('AutoSave não disponível', 'error');
            return;
        }
        
        const restored = window.autoSaveManager.restoreAll();
        
        if (restored === 0) {
            this.showToast('Nenhum dado salvo encontrado', 'info', 2000);
        } else {
            this._syncGlobalDataToAllForms();
        }
    },

    /**
     * Restaura sessão automaticamente ao carregar
     */
    _autoRestoreSession() {
        if (window.autoSaveManager && window.autoSaveManager.hasSavedData()) {
            setTimeout(() => {
                const shouldRestore = confirm('Dados salvos encontrados. Deseja restaurar a sessão anterior?');
                if (shouldRestore) {
                    window.autoSaveManager.restoreAll();
                    this._syncGlobalDataToAllForms();
                    this.showToast('Sessão restaurada com sucesso!', 'success', 3000);
                }
            }, 800);
        }
    },

    /**
     * Confirma reset de todos os formulários
     */
    _confirmResetAll() {
        const confirmed = confirm(
            '⚠️ ATENÇÃO: Isso irá limpar TODOS os dados preenchidos em TODOS os formulários.\n\n' +
            'Os campos LOCAL, OM e TAG também serão limpos.\n\n' +
            'Esta ação não pode ser desfeita.\n\n' +
            'Deseja continuar?'
        );
        
        if (confirmed) {
            this.resetAllForms();
        }
    },

    /**
     * Reseta todos os formulários
     */
    resetAllForms() {
        let resetCount = 0;
        
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.reset === 'function') {
                manager.reset();
                resetCount++;
            }
        });
        
        // Limpar campos de identificação LOCAL, OM, TAG
        const idFields = ['globalLocal', 'globalOM', 'globalTAG'];
        idFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('has-value');
            }
        });
        
        // Limpar localStorage dos formulários
        if (window.autoSaveManager) {
            window.autoSaveManager.clearAll();
        }
        
        localStorage.removeItem('inspform_identification');
        
        this.showToast(`${resetCount} formulários resetados!`, 'success', 3000);
        this._updateGlobalProgress();
        
        console.log('🔴 Todos os formulários foram resetados (incluindo LOCAL, OM, TAG)');
    },

    /**
     * Configura atalhos de teclado
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.exportManager?.downloadReport('full');
                this.showToast('Exportando relatório...', 'info', 1000);
            }

            // Ctrl+Shift+R
            if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
                e.preventDefault();
                this._confirmResetAll();
            }

            // Ctrl+H
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this._openShortcutsModal();
            }

            // Esc - fechar menu FAB e modais
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

            // Navegação 1-5 (apenas fora de inputs)
            if (!e.ctrlKey && !e.altKey && !e.metaKey &&
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 5) {
                    e.preventDefault();
                    const tabsMap = { 1: 'gnss', 2: 'cftv', 3: 'radio', 4: 'plc', 5: 'switch' };
                    const tab = document.querySelector(`.tab-button[data-tab="${tabsMap[num]}"]`);
                    if (tab) {
                        tab.click();
                        this.showToast(`Aba ${tabsMap[num].toUpperCase()}`, 'info', 800);
                    }
                }
            }
        });
        
        console.log('⌨️ Atalhos de teclado configurados');
    },

    /**
     * Configura barra de progresso global
     */
    _setupGlobalProgress() {
        this._updateGlobalProgress();
        
        // Atualizar progresso periodicamente
        if (this.state.progressIntervalId) {
            clearInterval(this.state.progressIntervalId);
        }
        this.state.progressIntervalId = setInterval(() => this._updateGlobalProgress(), 1000);
    },

    /**
     * Atualiza barra de progresso global
     */
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

    /**
     * Callback quando dados do formulário mudam
     */
    _onFormDataChange() {
        const now = Date.now();
        if (now - this.lastGlobalUpdate > 500) {
            this.lastGlobalUpdate = now;
            this._updateGlobalProgress();
        }
    },

    /**
     * Conecta AutoSave aos formulários
     */
    _connectAutoSave() {
        if (!window.autoSaveManager) {
            console.warn('AutoSaveManager não disponível');
            return;
        }
        
        // Registrar callbacks
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

    /**
     * Adiciona botão de reset na interface
     */
    _addResetButton() {
        // Verificar se já existe
        if (document.querySelector('.reset-bar')) return;
        
        const resetBar = document.createElement('div');
        resetBar.className = 'reset-bar';
        resetBar.innerHTML = `
            <button class="btn-reset" id="globalResetBtn" title="Limpar todos os formulários (Ctrl+Shift+R)">
                <i class="fas fa-trash-alt"></i>
                <span>Limpar Todos os Formulários</span>
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
    },
    
    /**
     * Configura modal de atalhos
     */
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
        
        // Fechar ao clicar no overlay
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this._closeModal();
            });
        }
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
                this._closeModal();
            }
        });
    },
    
    /**
     * Abre modal de atalhos
     */
    _openShortcutsModal() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focar no modal
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
            if (firstFocusable) firstFocusable.focus();
        }
    },
    
    /**
     * Fecha modal
     */
    _closeModal() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    },
    
    /**
     * Configura ajustes responsivos
     */
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
    },
    
    /**
     * Exibe mensagem de boas-vindas
     */
    _showWelcomeMessage() {
        setTimeout(() => {
            this.showToast(
                `👋 Bem-vindo ao ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION} | Preencha LOCAL, OM e TAG para identificar a inspeção`,
                'info',
                5000
            );
        }, 300);
    },
    
    /**
     * Exibe toast de notificação
     */
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
    
    /**
     * Remove toast da tela
     */
    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('is-exiting');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }
};

// Inicializar ao carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => App.init(), 100);
});

// Expor funções globalmente
window.showToast = (message, type, duration) => App.showToast(message, type, duration);
window.App = App;