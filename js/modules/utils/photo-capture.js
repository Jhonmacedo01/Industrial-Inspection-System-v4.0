/**
 * INSPECTION FORM v4.0.0
 * Módulo de Captura de Fotos - Versão Profissional com Galeria Robusta
 * @module photo-capture
 */

class PhotoCaptureManager {
    constructor(options = {}) {
        // Configurações
        this.maxPhotos = options.maxPhotos || 40;
        this.photos = [];
        this.containerId = options.containerId || 'photo-upload-area';
        this.formType = options.formType || 'general';
        this.onChangeCallbacks = [];
        this.container = null;
        this.initialized = false;
        this.isCameraOpen = false;
        this.debug = options.debug || false;
        this._isDestroyed = false;
        this._captureCount = 0;
        this._cameraAttempts = 0;
        this._maxCameraAttempts = 10;
        
        // Configurações de qualidade
        this.quality = options.quality || 0.90;
        this.preferredWidth = options.maxWidth || 1280;
        this.preferredHeight = options.maxHeight || 720;
        this.minWidth = 320;
        this.minHeight = 240;
        
        // Resoluções para fallback progressivo
        this.resolutionLevels = [
            { width: 1920, height: 1080, label: 'Full HD' },
            { width: 1280, height: 720, label: 'HD' },
            { width: 640, height: 480, label: 'VGA' },
            { width: 320, height: 240, label: 'QVGA' }
        ];
        this.currentResolutionIndex = 0;
        this._cameraCapabilities = null;
        this._currentStream = null;
        this._currentOverlay = null;
        this._currentVideo = null;
        
        // Elementos da UI
        this.elements = {
            fileInput: null,
            dropZone: null,
            grid: null,
            countEl: null,
            cameraBtn: null,
            galleryBtn: null,
            clearBtn: null,
            progressWrapper: null,
            progressFill: null,
            progressLabel: null
        };
        
        // Bind de métodos
        this.handleFileChange = this.handleFileChange.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.openCamera = this.openCamera.bind(this);
        this.openGallery = this.openGallery.bind(this);
        this.clearPhotos = this.clearPhotos.bind(this);
        this.removePhoto = this.removePhoto.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.capturePhoto = this.capturePhoto.bind(this);
        this.closeCamera = this.closeCamera.bind(this);
        this.addFile = this.addFile.bind(this);
        this.handleFiles = this.handleFiles.bind(this);
        this._tryCameraWithConstraints = this._tryCameraWithConstraints.bind(this);
        this._updateCaptureCount = this._updateCaptureCount.bind(this);
        this._trySimpleCamera = this._trySimpleCamera.bind(this);
        
        this._log('🔧 PhotoCaptureManager instanciado - Modo Captura Contínua');
    }

    _log(message, data = null) {
        if (this.debug) {
            if (data) {
                console.log(`[PhotoCapture:${this.formType}] ${message}`, data);
            } else {
                console.log(`[PhotoCapture:${this.formType}] ${message}`);
            }
        }
    }

    _error(message, error = null) {
        console.error(`[PhotoCapture:${this.formType}] ❌ ${message}`, error || '');
    }

    _warn(message, data = null) {
        console.warn(`[PhotoCapture:${this.formType}] ⚠️ ${message}`, data || '');
    }

    init() {
        if (this._isDestroyed) {
            this._error('❌ Manager já foi destruído');
            return this;
        }
        
        this._log('🚀 Inicializando...');
        
        try {
            this.container = document.getElementById(this.containerId);
            
            if (!this.container) {
                this._log('⚠️ Container não encontrado, criando...');
                this.container = this._createContainer();
            }
            
            if (!this.container) {
                this._error('❌ Falha ao criar container');
                return this;
            }

            this.render();
            this.attachEvents();
            this.initialized = true;
            
            this._log(`✅ Inicializado (max: ${this.maxPhotos} fotos, qualidade: ${Math.round(this.quality * 100)}%)`);
        } catch (error) {
            this._error('❌ Erro na inicialização', error);
        }
        
        return this;
    }

    _createContainer() {
        try {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'photo-upload-wrapper';
            
            let inserted = false;
            
            const itemsContainer = document.getElementById(`${this.formType}-items-container`);
            if (itemsContainer && itemsContainer.parentNode) {
                itemsContainer.parentNode.insertBefore(container, itemsContainer.nextSibling);
                inserted = true;
                this._log('✅ Container inserido após items-container');
            }
            
            if (!inserted) {
                const panel = document.getElementById(`panel-${this.formType}`);
                if (panel) {
                    panel.appendChild(container);
                    inserted = true;
                    this._log('✅ Container inserido no final do painel');
                }
            }
            
            if (!inserted) {
                document.body.appendChild(container);
                this._log('⚠️ Container inserido no body (fallback)');
            }
            
            return container;
        } catch (error) {
            this._error('❌ Erro ao criar container', error);
            return null;
        }
    }

    render() {
        if (!this.container || this._isDestroyed) {
            this._error('❌ Container não disponível para renderização');
            return;
        }

        this._log('📝 Renderizando interface...');
        
        try {
            const isFull = this.photos.length >= this.maxPhotos;
            const uniqueId = this.containerId.replace(/[^a-zA-Z0-9]/g, '_');

            this.container.innerHTML = `
                <div class="photo-section">
                    <div class="photo-section-header">
                        <div class="photo-section-title">
                            <i class="fas fa-camera"></i>
                            <span>Evidências Fotográficas</span>
                            <span class="photo-badge" id="${uniqueId}-badge">${this.photos.length}/${this.maxPhotos}</span>
                            <span class="photo-quality-badge" title="Qualidade das imagens">📸 ${Math.round(this.quality * 100)}%</span>
                        </div>
                        <div class="photo-section-actions">
                            <button type="button" class="btn-photo btn-photo--camera" id="${uniqueId}-camera" ${isFull ? 'disabled' : ''}>
                                <i class="fas fa-camera"></i>
                                <span>Câmera</span>
                            </button>
                            <button type="button" class="btn-photo btn-photo--gallery" id="${uniqueId}-gallery" ${isFull ? 'disabled' : ''}>
                                <i class="fas fa-images"></i>
                                <span>Galeria</span>
                            </button>
                            ${this.photos.length > 0 ? `
                            <button type="button" class="btn-photo btn-photo--clear" id="${uniqueId}-clear">
                                <i class="fas fa-trash-alt"></i>
                                <span>Limpar</span>
                            </button>` : ''}
                        </div>
                    </div>
                    <div class="photo-drop-zone" id="${uniqueId}-dropzone" ${isFull ? 'style="opacity:0.5;pointer-events:none"' : ''}>
                        <div class="photo-drop-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Arraste imagens ou clique para adicionar</p>
                            <small>${isFull ? 'Limite máximo de fotos atingido' : `Máx. ${this.maxPhotos} fotos · JPG, PNG, WEBP · Alta resolução`}</small>
                        </div>
                        <input type="file" id="${uniqueId}-fileinput" accept="image/*" multiple ${isFull ? 'disabled' : ''} style="display:none">
                    </div>
                    <div class="photo-grid-container" id="${uniqueId}-grid-container">
                        <div class="photo-grid" id="${uniqueId}-grid"></div>
                    </div>
                    <div class="photo-progress-wrapper" id="${uniqueId}-progress" style="display:none">
                        <div class="photo-progress-track">
                            <div class="photo-progress-fill" id="${uniqueId}-progress-fill"></div>
                        </div>
                        <span class="photo-progress-label" id="${uniqueId}-progress-label">0%</span>
                    </div>
                </div>
            `;

            // ATUALIZAR REFERÊNCIAS - GARANTIR QUE O FILE INPUT SEJA ENCONTRADO
            this.elements = {
                fileInput: document.getElementById(`${uniqueId}-fileinput`),
                dropZone: document.getElementById(`${uniqueId}-dropzone`),
                grid: document.getElementById(`${uniqueId}-grid`),
                countEl: document.getElementById(`${uniqueId}-badge`),
                cameraBtn: document.getElementById(`${uniqueId}-camera`),
                galleryBtn: document.getElementById(`${uniqueId}-gallery`),
                clearBtn: document.getElementById(`${uniqueId}-clear`),
                progressWrapper: document.getElementById(`${uniqueId}-progress`),
                progressFill: document.getElementById(`${uniqueId}-progress-fill`),
                progressLabel: document.getElementById(`${uniqueId}-progress-label`)
            };

            // VALIDAÇÃO: Se o fileInput não for encontrado, criar um temporário
            if (!this.elements.fileInput) {
                this._warn('⚠️ File input não encontrado, criando temporário...');
                this._createFallbackFileInput(uniqueId);
            }

            this.updateUI();
            this._log('✅ Interface renderizada');
        } catch (error) {
            this._error('❌ Erro ao renderizar', error);
        }
    }

    /**
     * Cria um file input de fallback caso o original não seja encontrado
     */
    _createFallbackFileInput(uniqueId) {
        try {
            const dropZone = document.getElementById(`${uniqueId}-dropzone`);
            if (dropZone) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = `${uniqueId}-fileinput`;
                fileInput.accept = 'image/*';
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                dropZone.appendChild(fileInput);
                
                this.elements.fileInput = fileInput;
                this.elements.fileInput.addEventListener('change', this.handleFileChange);
                this._log('✅ File input de fallback criado');
            }
        } catch (error) {
            this._error('❌ Erro ao criar file input de fallback', error);
        }
    }

    attachEvents() {
        if (this._isDestroyed) return;
        
        this._log('🔗 Anexando eventos...');
        
        try {
            const { dropZone, fileInput, cameraBtn, galleryBtn, clearBtn } = this.elements;

            // EVENTO DROP ZONE (CLIQUE PARA ABRIR GALERIA)
            if (dropZone) {
                dropZone.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._log('📂 Drop zone clicada');
                    if (this.photos.length < this.maxPhotos && !this.isCameraOpen) {
                        this.openGallery();
                    }
                });
                dropZone.addEventListener('dragover', this.handleDragOver);
                dropZone.addEventListener('dragleave', this.handleDragLeave);
                dropZone.addEventListener('drop', this.handleDrop);
                this._log('✅ Eventos de drop zone anexados');
            }

            // EVENTO FILE INPUT
            if (fileInput) {
                fileInput.addEventListener('change', this.handleFileChange);
                this._log('✅ Evento de file input anexado');
            } else {
                this._warn('⚠️ File input não encontrado para anexar evento');
            }

            // EVENTO BOTÃO CÂMERA
            if (cameraBtn) {
                cameraBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._log('📸 Botão câmera clicado');
                    this.openCamera();
                });
                this._log('✅ Evento do botão câmera anexado');
            }

            // EVENTO BOTÃO GALERIA (CORRIGIDO)
            if (galleryBtn) {
                // Remover listeners antigos para evitar duplicação
                const newGalleryBtn = galleryBtn.cloneNode(true);
                galleryBtn.parentNode.replaceChild(newGalleryBtn, galleryBtn);
                
                newGalleryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._log('🖼️ Botão galeria clicado');
                    this.openGallery();
                });
                
                // Atualizar referência
                this.elements.galleryBtn = newGalleryBtn;
                this._log('✅ Evento do botão galeria anexado (corrigido)');
            } else {
                this._warn('⚠️ Botão galeria não encontrado');
            }

            // EVENTO BOTÃO LIMPAR
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.clearPhotos();
                });
                this._log('✅ Evento do botão limpar anexado');
            }

            // EVENTO TECLADO
            document.addEventListener('keydown', this.handleKeyDown);
            this._log('✅ Eventos de teclado anexados');
        } catch (error) {
            this._error('❌ Erro ao anexar eventos', error);
        }
    }

    /**
     * ABRE A GALERIA - MÉTODO ROBUSTO
     */
    openGallery() {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return;
        }
        
        this._log('🖼️ Abrindo galeria...');
        
        if (this.photos.length >= this.maxPhotos) {
            window.showToast?.('⚠️ Limite de fotos atingido', 'warning', 2000);
            return;
        }
        
        // Tenta usar o fileInput existente
        if (this.elements.fileInput) {
            try {
                this.elements.fileInput.click();
                this._log('✅ Galeria aberta via file input');
                return;
            } catch (error) {
                this._error('❌ Erro ao clicar no file input', error);
            }
        }
        
        // Fallback: criar input temporário
        this._log('🔄 Usando fallback para abrir galeria');
        this._createTemporaryFileInput();
    }

    _createTemporaryFileInput() {
        this._log('🔄 Criando file input temporário...');
        try {
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = 'image/*';
            tempInput.multiple = true;
            tempInput.style.cssText = 'position:fixed;top:-1000px;left:-1000px;';
            document.body.appendChild(tempInput);
            
            tempInput.addEventListener('change', (e) => {
                if (e.target && e.target.files && e.target.files.length > 0) {
                    this.handleFiles(e.target.files);
                }
                if (tempInput.parentNode) {
                    document.body.removeChild(tempInput);
                }
            });
            
            // Disparar clique
            tempInput.click();
            this._log('✅ File input temporário acionado');
        } catch (error) {
            this._error('❌ Erro ao criar file input temporário', error);
            window.showToast?.('❌ Erro ao abrir galeria', 'error', 2000);
        }
    }

    // ... (outros métodos permanecem iguais, com as correções já aplicadas anteriormente)
    
    // IMPORTANTE: Os métodos handleDragOver, handleDragLeave, handleDrop, 
    // handleFileChange, handleKeyDown, openCamera, capturePhoto, closeCamera,
    // handleFiles, addFile, removePhoto, clearPhotos, updateUI, etc.
    // permanecem como na versão anterior, mas com os ajustes de fallback.
}

window.PhotoCaptureManager = PhotoCaptureManager;