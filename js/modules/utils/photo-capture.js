/**
 * INSPECTION FORM v4.0.0
 * Módulo de Captura de Fotos - VERSÃO DEFINITIVA COM GALERIA FUNCIONAL
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
        
        // Configurações de qualidade
        this.quality = options.quality || 0.90;
        
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
        
        this._log('🔧 PhotoCaptureManager instanciado');
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
            
            this._log(`✅ Inicializado (max: ${this.maxPhotos} fotos)`);
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
            this._error('❌ Container não disponível');
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
                            <small>${isFull ? 'Limite máximo de fotos atingido' : `Máx. ${this.maxPhotos} fotos · JPG, PNG, WEBP`}</small>
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

            // ATUALIZAR REFERÊNCIAS
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

            // GARANTIR QUE O FILE INPUT EXISTE
            if (!this.elements.fileInput) {
                this._warn('⚠️ File input não encontrado, criando...');
                this._createFileInput(uniqueId);
            }

            this.updateUI();
            this._log('✅ Interface renderizada');
        } catch (error) {
            this._error('❌ Erro ao renderizar', error);
        }
    }

    _createFileInput(uniqueId) {
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
                this._log('✅ File input criado');
            }
        } catch (error) {
            this._error('❌ Erro ao criar file input', error);
        }
    }

    attachEvents() {
        if (this._isDestroyed) return;
        
        this._log('🔗 Anexando eventos...');
        
        try {
            const { dropZone, fileInput, cameraBtn, galleryBtn, clearBtn } = this.elements;

            // DROP ZONE
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

            // FILE INPUT - GARANTIR QUE O EVENTO EXISTE
            if (fileInput) {
                // Remover listeners antigos para evitar duplicação
                const newFileInput = fileInput.cloneNode(true);
                if (fileInput.parentNode) {
                    fileInput.parentNode.replaceChild(newFileInput, fileInput);
                }
                newFileInput.addEventListener('change', this.handleFileChange);
                this.elements.fileInput = newFileInput;
                this._log('✅ Evento de file input anexado');
            } else {
                this._warn('⚠️ File input não encontrado');
            }

            // BOTÃO CÂMERA
            if (cameraBtn) {
                // Remover listeners antigos
                const newCameraBtn = cameraBtn.cloneNode(true);
                if (cameraBtn.parentNode) {
                    cameraBtn.parentNode.replaceChild(newCameraBtn, cameraBtn);
                }
                newCameraBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._log('📸 Botão câmera clicado');
                    this.openCamera();
                });
                this.elements.cameraBtn = newCameraBtn;
                this._log('✅ Evento do botão câmera anexado');
            }

            // BOTÃO GALERIA - CORREÇÃO PRINCIPAL
            if (galleryBtn) {
                // Remover listeners antigos
                const newGalleryBtn = galleryBtn.cloneNode(true);
                if (galleryBtn.parentNode) {
                    galleryBtn.parentNode.replaceChild(newGalleryBtn, galleryBtn);
                }
                newGalleryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._log('🖼️ Botão galeria clicado');
                    this.openGallery();
                });
                this.elements.galleryBtn = newGalleryBtn;
                this._log('✅ Evento do botão galeria anexado');
            } else {
                this._warn('⚠️ Botão galeria não encontrado');
            }

            // BOTÃO LIMPAR
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.clearPhotos();
                });
                this._log('✅ Evento do botão limpar anexado');
            }

            document.addEventListener('keydown', this.handleKeyDown);
            this._log('✅ Eventos de teclado anexados');
        } catch (error) {
            this._error('❌ Erro ao anexar eventos', error);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.photos.length < this.maxPhotos && !this._isDestroyed) {
            this.elements.dropZone?.classList.add('dragover');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.dropZone?.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.dropZone?.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && this.photos.length < this.maxPhotos && !this._isDestroyed) {
            this._log(`📥 ${e.dataTransfer.files.length} arquivos arrastados`);
            this.handleFiles(e.dataTransfer.files);
        }
    }

    handleFileChange(e) {
        if (this._isDestroyed) return;
        
        if (e.target && e.target.files && e.target.files.length > 0) {
            this._log(`📥 ${e.target.files.length} arquivos selecionados`);
            this.handleFiles(e.target.files);
        }
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
    }

    handleKeyDown(e) {
        if (this._isDestroyed) return;
        
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input, textarea, button')) {
            const selected = this.elements.grid?.querySelector('.photo-item.selected');
            if (selected) {
                const index = parseInt(selected.dataset.index, 10);
                if (!isNaN(index)) {
                    e.preventDefault();
                    this.removePhoto(index);
                }
            }
        }
        if (e.key === 'Escape' && this.isCameraOpen) {
            this.closeCamera();
        }
    }

    /**
     * ABRE A GALERIA - MÉTODO CORRIGIDO
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
        
        // VERIFICAR SE O FILE INPUT EXISTE E ESTÁ NO DOM
        if (this.elements.fileInput) {
            try {
                // Verificar se o elemento está no DOM
                if (document.contains(this.elements.fileInput)) {
                    this.elements.fileInput.click();
                    this._log('✅ Galeria aberta via file input');
                    return;
                } else {
                    this._warn('⚠️ File input não está no DOM, recriando...');
                    this._recreateFileInput();
                }
            } catch (error) {
                this._error('❌ Erro ao clicar no file input', error);
            }
        }
        
        // SE CHEGOU AQUI, FALLBACK
        this._log('🔄 Usando fallback para abrir galeria');
        this._createTemporaryFileInput();
    }

    _recreateFileInput() {
        try {
            const uniqueId = this.containerId.replace(/[^a-zA-Z0-9]/g, '_');
            const dropZone = document.getElementById(`${uniqueId}-dropzone`);
            
            if (dropZone) {
                // Remover file input antigo
                const oldInput = document.getElementById(`${uniqueId}-fileinput`);
                if (oldInput) {
                    oldInput.remove();
                }
                
                // Criar novo
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = `${uniqueId}-fileinput`;
                fileInput.accept = 'image/*';
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                dropZone.appendChild(fileInput);
                
                fileInput.addEventListener('change', this.handleFileChange);
                this.elements.fileInput = fileInput;
                this._log('✅ File input recriado');
                
                // Tentar abrir novamente
                fileInput.click();
                this._log('✅ Galeria aberta após recriação');
            }
        } catch (error) {
            this._error('❌ Erro ao recriar file input', error);
        }
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
            
            tempInput.click();
            this._log('✅ File input temporário acionado');
        } catch (error) {
            this._error('❌ Erro ao criar file input temporário', error);
            window.showToast?.('❌ Erro ao abrir galeria', 'error', 2000);
        }
    }

    // ==========================================================================
    // MÉTODOS DA CÂMERA (SIMPLIFICADOS PARA ESTE FIX)
    // ==========================================================================

    openCamera() {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return;
        }

        if (this.isCameraOpen) {
            this._log('⚠️ Câmera já está aberta');
            return;
        }
        
        this._log('📸 Tentando abrir câmera...');
        
        if (this.photos.length >= this.maxPhotos) {
            window.showToast?.('⚠️ Limite de fotos atingido', 'warning', 2000);
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this._error('❌ Navegador não suporta câmera');
            window.showToast?.('❌ Seu navegador não suporta câmera. Use a galeria.', 'error', 3000);
            this.openGallery();
            return;
        }

        // Tentar abrir câmera com configuração simples
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        })
        .then((stream) => {
            this._handleCameraStream(stream);
        })
        .catch((err) => {
            this._error('❌ Erro ao acessar câmera', err);
            this.isCameraOpen = false;
            
            // Tentar com facingMode 'user'
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            })
            .then((stream) => {
                this._handleCameraStream(stream);
            })
            .catch((err2) => {
                this._error('❌ Erro ao acessar câmera com user', err2);
                // Tentar sem facingMode
                navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                })
                .then((stream) => {
                    this._handleCameraStream(stream);
                })
                .catch((err3) => {
                    this._error('❌ Todas as tentativas de abrir a câmera falharam', err3);
                    window.showToast?.('❌ Não foi possível acessar a câmera. Use a galeria.', 'error', 4000);
                    this.openGallery();
                });
            });
        });
    }

    _handleCameraStream(stream) {
        this._log('✅ Câmera aberta com sucesso');
        this.isCameraOpen = true;
        this._currentStream = stream;
        
        const overlay = this._createSimpleCameraOverlay();
        
        if (!overlay) {
            this._error('❌ Falha ao criar overlay da câmera');
            this.isCameraOpen = false;
            stream.getTracks().forEach(track => track.stop());
            this.openGallery();
            return;
        }
        
        document.body.appendChild(overlay);
        this._currentOverlay = overlay;

        const video = overlay.querySelector('#cameraVideo');
        if (video) {
            video.srcObject = stream;
            this._currentVideo = video;
            video.play().catch(err => {
                this._error('❌ Erro ao reproduzir vídeo', err);
            });
            this._log('▶️ Vídeo em reprodução');
        }
        
        const captureBtn = overlay.querySelector('#cameraCaptureBtn');
        if (captureBtn) {
            const newCaptureBtn = captureBtn.cloneNode(true);
            captureBtn.parentNode.replaceChild(newCaptureBtn, captureBtn);
            newCaptureBtn.addEventListener('click', () => {
                this._log('📸 Capturando foto...');
                this.capturePhoto();
            });
        }
        
        const closeBtn = overlay.querySelector('#cameraCloseBtn');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                this._log('❌ Fechando câmera...');
                this.closeCamera();
            });
        }
        
        this._updateCaptureCount();
    }

    _createSimpleCameraOverlay() {
        try {
            const overlay = document.createElement('div');
            overlay.id = 'cameraOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: rgba(255,255,255,0.8);
                font-family: 'Inter', sans-serif;
                padding: 10px 20px;
                background: rgba(0,0,0,0.5);
                border-radius: 12px;
                backdrop-filter: blur(10px);
            `;
            header.innerHTML = `
                <span style="font-size:14px;font-weight:600;">📸 Captura Contínua</span>
                <span style="font-size:12px;opacity:0.7;">${this.photos.length}/${this.maxPhotos} fotos</span>
            `;
            overlay.appendChild(header);

            const videoWrapper = document.createElement('div');
            videoWrapper.style.cssText = `
                width: 100%;
                max-width: 900px;
                height: 60vh;
                max-height: 600px;
                background: #111;
                border-radius: 16px;
                overflow: hidden;
                position: relative;
                margin: 60px 20px 20px;
            `;

            const video = document.createElement('video');
            video.id = 'cameraVideo';
            video.style.cssText = `width:100%;height:100%;object-fit:cover;`;
            video.setAttribute('autoplay', '');
            video.setAttribute('playsinline', '');
            videoWrapper.appendChild(video);

            const flash = document.createElement('div');
            flash.id = 'cameraFlash';
            flash.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.1s;
                border-radius: 16px;
            `;
            videoWrapper.appendChild(flash);

            const controls = document.createElement('div');
            controls.style.cssText = `
                display: flex;
                gap: 20px;
                margin-top: 10px;
                margin-bottom: 30px;
                align-items: center;
                flex-wrap: wrap;
                justify-content: center;
            `;

            const counterDisplay = document.createElement('span');
            counterDisplay.id = 'cameraCounter';
            counterDisplay.style.cssText = `
                color: rgba(255,255,255,0.8);
                font-size: 14px;
                font-family: 'Inter', sans-serif;
                background: rgba(0,0,0,0.4);
                padding: 8px 16px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                min-width: 80px;
                text-align: center;
            `;
            counterDisplay.textContent = `📷 0 fotos`;
            controls.appendChild(counterDisplay);

            const captureBtn = document.createElement('button');
            captureBtn.id = 'cameraCaptureBtn';
            captureBtn.innerHTML = '<i class="fas fa-circle" style="font-size:24px;"></i> Capturar';
            captureBtn.style.cssText = `
                background: #ef4444;
                color: #fff;
                border: none;
                padding: 14px 32px;
                border-radius: 50px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(239,68,68,0.4);
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'Inter', sans-serif;
                transition: transform 0.2s;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.id = 'cameraCloseBtn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Fechar';
            closeBtn.style.cssText = `
                background: rgba(255,255,255,0.15);
                color: #fff;
                border: 2px solid rgba(255,255,255,0.3);
                padding: 14px 28px;
                border-radius: 50px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(10px);
            `;

            controls.appendChild(captureBtn);
            controls.appendChild(closeBtn);

            overlay.appendChild(videoWrapper);
            overlay.appendChild(controls);

            return overlay;
        } catch (error) {
            this._error('❌ Erro ao criar overlay da câmera', error);
            return null;
        }
    }

    _updateCaptureCount() {
        const counter = document.getElementById('cameraCounter');
        if (counter) {
            counter.textContent = `📷 ${this.photos.length} fotos`;
        }
        
        if (this.elements.countEl) {
            this.elements.countEl.textContent = `${this.photos.length}/${this.maxPhotos}`;
        }
    }

    capturePhoto() {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return;
        }
        
        if (!this.isCameraOpen) {
            this._error('❌ Câmera não está aberta');
            return;
        }
        
        if (this.photos.length >= this.maxPhotos) {
            window.showToast?.('⚠️ Limite de fotos atingido', 'warning', 2000);
            return;
        }
        
        const video = this._currentVideo;
        if (!video) {
            this._error('❌ Vídeo não disponível para captura');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const videoWidth = video.videoWidth || 640;
            const videoHeight = video.videoHeight || 480;
            
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                this._error('❌ Contexto 2D não disponível');
                return;
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const flash = document.getElementById('cameraFlash');
            if (flash) {
                flash.style.opacity = '0.8';
                setTimeout(() => {
                    flash.style.opacity = '0';
                }, 100);
            }

            canvas.toBlob((blob) => {
                if (blob && !this._isDestroyed) {
                    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    this._log(`📸 Foto capturada: ${file.size} bytes`);
                    this.addFile(file);
                    this._updateCaptureCount();
                    this.updateUI();
                    this.notifyChange();
                    window.showToast?.('📸 Foto capturada!', 'success', 1000);
                } else {
                    this._error('❌ Blob vazio na captura');
                    window.showToast?.('❌ Erro ao capturar foto.', 'error', 2000);
                }
            }, 'image/jpeg', this.quality);
        } catch (error) {
            this._error('❌ Erro ao capturar foto', error);
            window.showToast?.('❌ Erro ao capturar foto.', 'error', 2000);
        }
    }

    closeCamera() {
        this._log('🔚 Fechando câmera...');
        this.isCameraOpen = false;

        try {
            if (this._currentStream && typeof this._currentStream.getTracks === 'function') {
                this._currentStream.getTracks().forEach(track => {
                    track.stop();
                    this._log(`🔴 Track ${track.kind} parada`);
                });
                this._currentStream = null;
            }
        } catch (error) {
            this._error('❌ Erro ao parar stream', error);
        }

        try {
            if (this._currentOverlay && this._currentOverlay.parentNode) {
                document.body.removeChild(this._currentOverlay);
                this._log('✅ Overlay removido');
                this._currentOverlay = null;
            }
        } catch (error) {
            this._error('❌ Erro ao remover overlay', error);
        }

        this._currentVideo = null;

        const existingOverlay = document.getElementById('cameraOverlay');
        if (existingOverlay && existingOverlay.parentNode) {
            try {
                document.body.removeChild(existingOverlay);
                this._log('✅ Overlay residual removido');
            } catch (error) {
                this._error('❌ Erro ao remover overlay residual', error);
            }
        }
        
        this._log('✅ Câmera fechada');
    }

    // ==========================================================================
    // MÉTODOS DE ARQUIVOS
    // ==========================================================================

    handleFiles(files) {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return;
        }
        
        if (!files || files.length === 0) {
            this._log('⚠️ Nenhum arquivo para processar');
            return;
        }
        
        this._log(`📥 Processando ${files.length} arquivos...`);
        
        const validFiles = [];
        const errors = [];
        const remaining = this.maxPhotos - this.photos.length;

        for (const file of files) {
            if (!file.type || !file.type.startsWith('image/')) {
                errors.push(`"${file.name || 'arquivo'}" não é uma imagem`);
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                errors.push(`"${file.name || 'arquivo'}" excede 20MB`);
                continue;
            }
            if (validFiles.length >= remaining) {
                errors.push(`Limite de ${this.maxPhotos} fotos atingido`);
                break;
            }
            validFiles.push(file);
        }

        if (errors.length > 0) {
            const errorMsg = errors.slice(0, 3).join(' | ');
            window.showToast?.(`⚠️ ${errorMsg}`, 'warning', 4000);
            this._log(`⚠️ ${errors.length} erros:`, errors);
        }

        if (validFiles.length > 0 && !this._isDestroyed) {
            this._log(`✅ ${validFiles.length} arquivos válidos`);
            this.showProgress(true);
            let processed = 0;
            
            for (const file of validFiles) {
                this.addFile(file).then(() => {
                    processed++;
                    const progress = (processed / validFiles.length) * 100;
                    this.updateProgress(progress);
                }).catch(err => {
                    this._error('❌ Erro ao adicionar arquivo', err);
                });
            }
            
            setTimeout(() => {
                if (!this._isDestroyed) {
                    this.showProgress(false);
                    this.updateUI();
                    this.notifyChange();
                    this._log(`✅ ${validFiles.length} arquivos processados`);
                }
            }, 500);
        }
    }

    addFile(file) {
        return new Promise((resolve, reject) => {
            if (this._isDestroyed) {
                reject(new Error('Manager destruído'));
                return;
            }
            
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const img = new Image();
                        img.onload = () => {
                            if (!this._isDestroyed) {
                                this.photos.push({
                                    id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
                                    file: file,
                                    dataUrl: e.target.result,
                                    name: file.name || 'foto.jpg',
                                    size: file.size,
                                    type: file.type || 'image/jpeg',
                                    width: img.width,
                                    height: img.height,
                                    uploadedAt: new Date().toISOString()
                                });
                                this._log(`📷 Foto adicionada: ${file.name || 'foto'} (${img.width}x${img.height})`);
                                this.updateUI();
                                this._updateCaptureCount();
                                resolve();
                            } else {
                                reject(new Error('Manager destruído durante carregamento'));
                            }
                        };
                        img.onerror = () => {
                            this._error(`❌ Erro ao carregar imagem: ${file.name || 'foto'}`);
                            reject(new Error('Erro ao carregar imagem'));
                        };
                        img.src = e.target.result;
                    } catch (error) {
                        this._error('❌ Erro no processamento da imagem', error);
                        reject(error);
                    }
                };
                reader.onerror = () => {
                    this._error(`❌ Erro ao ler arquivo: ${file.name || 'foto'}`);
                    reject(new Error('Erro ao ler arquivo'));
                };
                reader.readAsDataURL(file);
            } catch (error) {
                this._error('❌ Erro ao adicionar arquivo', error);
                reject(error);
            }
        });
    }

    removePhoto(index) {
        if (this._isDestroyed) return;
        
        if (index >= 0 && index < this.photos.length) {
            const removed = this.photos.splice(index, 1);
            this._log(`🗑️ Foto removida: ${removed[0]?.name || index}`);
            this.updateUI();
            this._updateCaptureCount();
            this.notifyChange();
            window.showToast?.('🗑️ Foto removida', 'info', 1000);
        }
    }

    clearPhotos() {
        if (this._isDestroyed) return;
        if (this.photos.length === 0) return;
        
        if (window.confirm('⚠️ Deseja remover todas as fotos?')) {
            this._log(`🗑️ Limpando ${this.photos.length} fotos`);
            this.photos = [];
            this.updateUI();
            this._updateCaptureCount();
            this.notifyChange();
            window.showToast?.('🗑️ Todas as fotos removidas', 'info', 1500);
        }
    }

    getPhotosData() {
        if (this._isDestroyed) return [];
        return this.photos.map(p => ({
            id: p.id,
            name: p.name,
            dataUrl: p.dataUrl,
            size: p.size,
            width: p.width || 0,
            height: p.height || 0,
            uploadedAt: p.uploadedAt
        }));
    }

    hasPhotos() { return !this._isDestroyed && this.photos.length > 0; }
    getCount() { return this._isDestroyed ? 0 : this.photos.length; }

    onChange(callback) {
        if (typeof callback === 'function' && !this._isDestroyed) {
            this.onChangeCallbacks.push(callback);
        }
    }

    notifyChange() {
        if (this._isDestroyed) return;
        this.onChangeCallbacks.forEach(cb => {
            try { cb(this.photos); } 
            catch (e) { this._error('❌ Observer error:', e); }
        });
    }

    updateUI() {
        if (this._isDestroyed || !this.elements.grid) {
            return;
        }

        const isFull = this.photos.length >= this.maxPhotos;

        if (this.elements.countEl) {
            this.elements.countEl.textContent = `${this.photos.length}/${this.maxPhotos}`;
        }

        if (this.elements.dropZone) {
            this.elements.dropZone.style.opacity = isFull ? '0.5' : '1';
            this.elements.dropZone.style.pointerEvents = isFull ? 'none' : 'auto';
        }

        if (this.elements.cameraBtn) this.elements.cameraBtn.disabled = isFull;
        if (this.elements.galleryBtn) this.elements.galleryBtn.disabled = isFull;
        if (this.elements.fileInput) this.elements.fileInput.disabled = isFull;

        if (this.photos.length === 0) {
            this.elements.grid.innerHTML = `
                <div class="photo-empty">
                    <i class="fas fa-camera-retro"></i>
                    <p>Nenhuma foto adicionada</p>
                    <small>Use a câmera ou a galeria para adicionar evidências</small>
                </div>
            `;
        } else {
            this.elements.grid.innerHTML = this.photos.map((photo, index) => `
                <div class="photo-item" data-index="${index}" data-id="${photo.id}">
                    <img src="${photo.dataUrl}" alt="Foto ${index + 1}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-index">#${index + 1}</span>
                        <span class="photo-resolution">${photo.width || '?'}x${photo.height || '?'}</span>
                        <button type="button" class="photo-remove" data-index="${index}" title="Remover foto">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="photo-info">
                        <span class="photo-name">${this._truncateName(photo.name)}</span>
                        <span class="photo-size">${this._formatSize(photo.size)}</span>
                    </div>
                </div>
            `).join('');
        }

        this.elements.grid.querySelectorAll('.photo-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index, 10);
                if (!isNaN(index) && !this._isDestroyed) {
                    this.removePhoto(index);
                }
            });
        });

        this.elements.grid.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => {
                if (this._isDestroyed) return;
                this.elements.grid.querySelectorAll('.photo-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            });
        });

        const clearBtn = this.elements.clearBtn || this.container?.querySelector('.btn-photo--clear');
        if (this.photos.length > 0 && !clearBtn && !this._isDestroyed) {
            const actions = this.container?.querySelector('.photo-section-actions');
            if (actions) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-photo btn-photo--clear';
                btn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Limpar</span>';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this._isDestroyed) this.clearPhotos();
                });
                actions.appendChild(btn);
                this.elements.clearBtn = btn;
            }
        } else if (this.photos.length === 0 && clearBtn) {
            clearBtn.remove();
            this.elements.clearBtn = null;
        }
    }

    showProgress(show) {
        if (this.elements.progressWrapper && !this._isDestroyed) {
            this.elements.progressWrapper.style.display = show ? 'flex' : 'none';
        }
    }

    updateProgress(percent) {
        if (this.elements.progressFill && !this._isDestroyed) {
            this.elements.progressFill.style.width = `${Math.min(100, percent)}%`;
        }
        if (this.elements.progressLabel && !this._isDestroyed) {
            this.elements.progressLabel.textContent = `${Math.round(percent)}%`;
        }
    }

    _truncateName(name, maxLen = 18) {
        if (!name) return '';
        return name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
    }

    _formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    destroy() {
        if (this._isDestroyed) return;
        
        this._log('🧹 Destruindo...');
        this._isDestroyed = true;
        this.photos = [];
        this.onChangeCallbacks = [];
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        if (this.isCameraOpen) {
            this.closeCamera();
        }
        
        document.removeEventListener('keydown', this.handleKeyDown);
        this.initialized = false;
        this._log('✅ Destruído');
    }
}

window.PhotoCaptureManager = PhotoCaptureManager;