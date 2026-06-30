/**
 * INSPECTION FORM v3.1.0
 * Módulo de Captura de Fotos - Versão Premium
 * @module photo-capture
 */

class PhotoCaptureManager {
    constructor(options = {}) {
        this.maxPhotos = options.maxPhotos || 40;
        this.photos = [];
        this.containerId = options.containerId || 'photo-upload-area';
        this.formType = options.formType || 'general';
        this.itemNumber = options.itemNumber || null;
        this.onChangeCallbacks = [];
        this.container = null;
        this.initialized = false;
        this.isCameraOpen = false;
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn(`[PhotoCapture] Container #${this.containerId} não encontrado`);
            return;
        }

        this.render();
        this.attachEvents();
        this.initialized = true;
        console.log(`[PhotoCapture] Inicializado (max: ${this.maxPhotos} fotos)`);
        return this;
    }

    render() {
        const remaining = this.maxPhotos - this.photos.length;
        const isFull = this.photos.length >= this.maxPhotos;

        this.container.innerHTML = `
            <div class="photo-section">
                <div class="photo-section-header">
                    <div class="photo-section-title">
                        <i class="fas fa-camera"></i>
                        <span>Evidências Fotográficas</span>
                        <span class="photo-badge">${this.photos.length}/${this.maxPhotos}</span>
                    </div>
                    <div class="photo-section-actions">
                        <button type="button" class="btn-photo btn-photo--camera" id="photoCameraBtn" ${isFull ? 'disabled' : ''}>
                            <i class="fas fa-camera"></i>
                            <span>Câmera</span>
                        </button>
                        <button type="button" class="btn-photo btn-photo--gallery" id="photoGalleryBtn" ${isFull ? 'disabled' : ''}>
                            <i class="fas fa-images"></i>
                            <span>Galeria</span>
                        </button>
                        ${this.photos.length > 0 ? `
                        <button type="button" class="btn-photo btn-photo--clear" id="photoClearBtn">
                            <i class="fas fa-trash-alt"></i>
                            <span>Limpar</span>
                        </button>` : ''}
                    </div>
                </div>
                <div class="photo-drop-zone" id="photoDropZone" ${isFull ? 'style="opacity:0.5;pointer-events:none"' : ''}>
                    <div class="photo-drop-content">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Arraste imagens ou clique para adicionar</p>
                        <small>${isFull ? 'Limite máximo de fotos atingido' : `Máx. ${this.maxPhotos} fotos · JPG, PNG, WEBP`}</small>
                    </div>
                    <input type="file" id="photoFileInput" accept="image/*" multiple ${isFull ? 'disabled' : ''} style="display:none">
                </div>
                <div class="photo-grid-container" id="photoGridContainer">
                    <div class="photo-grid" id="photoGrid"></div>
                </div>
                <div class="photo-progress-wrapper" id="photoProgressWrapper" style="display:none">
                    <div class="photo-progress-track">
                        <div class="photo-progress-fill" id="photoProgressFill"></div>
                    </div>
                    <span class="photo-progress-label" id="photoProgressLabel">0%</span>
                </div>
            </div>
        `;

        this.fileInput = document.getElementById('photoFileInput');
        this.dropZone = document.getElementById('photoDropZone');
        this.grid = document.getElementById('photoGrid');
        this.gridContainer = document.getElementById('photoGridContainer');
        this.progressWrapper = document.getElementById('photoProgressWrapper');
        this.progressFill = document.getElementById('photoProgressFill');
        this.progressLabel = document.getElementById('photoProgressLabel');
        this.cameraBtn = document.getElementById('photoCameraBtn');
        this.galleryBtn = document.getElementById('photoGalleryBtn');
        this.clearBtn = document.getElementById('photoClearBtn');

        this.updateUI();
    }

    attachEvents() {
        if (this.dropZone) {
            this.dropZone.addEventListener('click', () => {
                if (this.photos.length < this.maxPhotos && !this.isCameraOpen) {
                    this.fileInput?.click();
                }
            });

            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.photos.length < this.maxPhotos) {
                    this.dropZone.classList.add('dragover');
                }
            });

            this.dropZone.addEventListener('dragleave', () => {
                this.dropZone.classList.remove('dragover');
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length && this.photos.length < this.maxPhotos) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFiles(e.target.files);
                }
                this.fileInput.value = '';
            });
        }

        if (this.cameraBtn) {
            this.cameraBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCamera();
            });
        }

        if (this.galleryBtn) {
            this.galleryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.photos.length < this.maxPhotos) {
                    this.fileInput?.click();
                }
            });
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearPhotos();
            });
        }

        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input, textarea')) {
                const selected = this.grid?.querySelector('.photo-item.selected');
                if (selected) {
                    const index = parseInt(selected.dataset.index, 10);
                    if (!isNaN(index)) this.removePhoto(index);
                }
            }
            // Fechar câmera com ESC
            if (e.key === 'Escape' && this.isCameraOpen) {
                this.closeCamera();
            }
        });
    }

    openCamera() {
        if (this.photos.length >= this.maxPhotos) {
            window.showToast?.('Limite de fotos atingido', 'warning', 2000);
            return;
        }

        if (this.isCameraOpen) return;
        this.isCameraOpen = true;

        // Criar overlay da câmera
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

        // Container do vídeo
        const videoWrapper = document.createElement('div');
        videoWrapper.style.cssText = `
            width: 100%;
            max-width: 800px;
            height: 60vh;
            max-height: 600px;
            background: #111;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            margin: 20px;
        `;

        const video = document.createElement('video');
        video.id = 'cameraVideo';
        video.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
        `;
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');

        videoWrapper.appendChild(video);

        // Controles da câmera
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 20px;
            margin-top: 20px;
            margin-bottom: 30px;
        `;

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
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Inter', sans-serif;
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
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Inter', sans-serif;
            backdrop-filter: blur(10px);
        `;

        // Instruções
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            color: rgba(255,255,255,0.6);
            font-size: 14px;
            margin-top: 8px;
            text-align: center;
            font-family: 'Inter', sans-serif;
        `;
        instructions.textContent = 'Clique em "Capturar" para tirar a foto ou "Fechar" para cancelar';

        controls.appendChild(captureBtn);
        controls.appendChild(closeBtn);

        overlay.appendChild(videoWrapper);
        overlay.appendChild(controls);
        overlay.appendChild(instructions);

        document.body.appendChild(overlay);

        // Iniciar stream
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        })
        .then((stream) => {
            video.srcObject = stream;
            video.play();

            // Evento de captura
            captureBtn.addEventListener('click', () => {
                this.capturePhoto(video, stream, overlay);
            });

            // Evento de fechamento
            closeBtn.addEventListener('click', () => {
                this.closeCamera(stream, overlay);
            });

        })
        .catch((error) => {
            console.error('[PhotoCapture] Erro ao acessar câmera:', error);
            this.isCameraOpen = false;

            let errorMsg = 'Erro ao acessar a câmera.';
            if (error.name === 'NotAllowedError') {
                errorMsg = 'Permissão de câmera negada. Permita o acesso nas configurações do navegador.';
            } else if (error.name === 'NotFoundError') {
                errorMsg = 'Nenhuma câmera encontrada no dispositivo.';
            }

            window.showToast?.(errorMsg, 'error', 4000);

            // Fechar overlay em caso de erro
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }

            // Fallback para galeria
            setTimeout(() => {
                this.fileInput?.click();
            }, 500);
        });
    }

    capturePhoto(video, stream, overlay) {
        try {
            const canvas = document.createElement('canvas');
            const videoWidth = video.videoWidth || 1280;
            const videoHeight = video.videoHeight || 720;
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    this.addFile(file);
                    this.closeCamera(stream, overlay);
                    window.showToast?.('📸 Foto capturada com sucesso!', 'success', 2000);
                } else {
                    window.showToast?.('Erro ao capturar foto. Tente novamente.', 'error', 2000);
                }
            }, 'image/jpeg', 0.92);
        } catch (error) {
            console.error('[PhotoCapture] Erro ao capturar:', error);
            window.showToast?.('Erro ao capturar foto.', 'error', 2000);
            this.closeCamera(stream, overlay);
        }
    }

    closeCamera(stream, overlay) {
        this.isCameraOpen = false;

        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => track.stop());
        }

        if (overlay && overlay.parentNode) {
            document.body.removeChild(overlay);
        }

        // Fallback: remover overlay se ainda existir
        const existingOverlay = document.getElementById('cameraOverlay');
        if (existingOverlay && existingOverlay.parentNode) {
            document.body.removeChild(existingOverlay);
        }
    }

    async handleFiles(files) {
        const validFiles = [];
        const errors = [];
        const remaining = this.maxPhotos - this.photos.length;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                errors.push(`"${file.name}" não é uma imagem`);
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                errors.push(`"${file.name}" excede 10MB`);
                continue;
            }

            if (validFiles.length >= remaining) {
                errors.push(`Limite de ${this.maxPhotos} fotos atingido`);
                break;
            }

            validFiles.push(file);
        }

        if (errors.length) {
            window.showToast?.(errors.slice(0, 3).join(' | '), 'warning', 4000);
        }

        if (validFiles.length) {
            this.showProgress(true);

            let processed = 0;
            for (const file of validFiles) {
                await this.addFile(file);
                processed++;
                const progress = (processed / validFiles.length) * 100;
                this.updateProgress(progress);
            }

            setTimeout(() => {
                this.showProgress(false);
                this.updateUI();
                this.notifyChange();
            }, 500);
        }
    }

    async addFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photos.push({
                    id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
                    file: file,
                    dataUrl: e.target.result,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString()
                });
                this.updateUI();
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    removePhoto(index) {
        if (index >= 0 && index < this.photos.length) {
            this.photos.splice(index, 1);
            this.updateUI();
            this.notifyChange();
            window.showToast?.('Foto removida', 'info', 1000);
        }
    }

    clearPhotos() {
        if (this.photos.length === 0) return;

        const confirm = window.confirm('Deseja remover todas as fotos?');
        if (confirm) {
            this.photos = [];
            this.updateUI();
            this.notifyChange();
            window.showToast?.('Todas as fotos removidas', 'info', 1500);
        }
    }

    getPhotosData() {
        return this.photos.map(p => ({
            id: p.id,
            name: p.name,
            dataUrl: p.dataUrl,
            size: p.size,
            uploadedAt: p.uploadedAt
        }));
    }

    hasPhotos() {
        return this.photos.length > 0;
    }

    getCount() {
        return this.photos.length;
    }

    onChange(callback) {
        if (typeof callback === 'function') {
            this.onChangeCallbacks.push(callback);
        }
    }

    notifyChange() {
        this.onChangeCallbacks.forEach(cb => {
            try {
                cb(this.photos);
            } catch (error) {
                console.error('[PhotoCapture] Erro em observer:', error);
            }
        });
    }

    updateUI() {
        if (!this.grid) return;

        const remaining = this.maxPhotos - this.photos.length;
        const isFull = this.photos.length >= this.maxPhotos;

        const badge = this.container?.querySelector('.photo-badge');
        if (badge) {
            badge.textContent = `${this.photos.length}/${this.maxPhotos}`;
        }

        if (this.dropZone) {
            this.dropZone.style.opacity = isFull ? '0.5' : '1';
            this.dropZone.style.pointerEvents = isFull ? 'none' : 'auto';
        }

        if (this.cameraBtn) {
            this.cameraBtn.disabled = isFull;
        }
        if (this.galleryBtn) {
            this.galleryBtn.disabled = isFull;
        }
        if (this.fileInput) {
            this.fileInput.disabled = isFull;
        }

        if (this.photos.length === 0) {
            this.grid.innerHTML = `
                <div class="photo-empty">
                    <i class="fas fa-camera-retro"></i>
                    <p>Nenhuma foto adicionada</p>
                    <small>Use a câmera ou galeria para adicionar evidências</small>
                </div>
            `;
        } else {
            this.grid.innerHTML = this.photos.map((photo, index) => `
                <div class="photo-item" data-index="${index}" data-id="${photo.id}">
                    <img src="${photo.dataUrl}" alt="Foto ${index + 1}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-index">#${index + 1}</span>
                        <button type="button" class="photo-remove" data-index="${index}" title="Remover foto">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="photo-info">
                        <span class="photo-name">${this.truncateName(photo.name)}</span>
                        <span class="photo-size">${this.formatSize(photo.size)}</span>
                    </div>
                </div>
            `).join('');
        }

        this.grid.querySelectorAll('.photo-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index, 10);
                if (!isNaN(index)) this.removePhoto(index);
            });
        });

        this.grid.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => {
                this.grid.querySelectorAll('.photo-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            });
        });

        const clearBtn = this.container?.querySelector('#photoClearBtn');
        if (this.photos.length > 0 && !clearBtn) {
            const actions = this.container?.querySelector('.photo-section-actions');
            if (actions) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-photo btn-photo--clear';
                btn.id = 'photoClearBtn';
                btn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Limpar</span>';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clearPhotos();
                });
                actions.appendChild(btn);
            }
        } else if (this.photos.length === 0 && clearBtn) {
            clearBtn.remove();
        }
    }

    showProgress(show) {
        if (this.progressWrapper) {
            this.progressWrapper.style.display = show ? 'flex' : 'none';
        }
    }

    updateProgress(percent) {
        if (this.progressFill) {
            this.progressFill.style.width = `${Math.min(100, percent)}%`;
        }
        if (this.progressLabel) {
            this.progressLabel.textContent = `${Math.round(percent)}%`;
        }
    }

    truncateName(name, maxLen = 18) {
        if (!name) return '';
        return name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
    }

    formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    destroy() {
        this.photos = [];
        this.onChangeCallbacks = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
        // Fechar câmera se estiver aberta
        if (this.isCameraOpen) {
            this.closeCamera();
        }
    }
}

window.PhotoCaptureManager = PhotoCaptureManager;