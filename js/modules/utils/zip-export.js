/**
 * INSPECTION FORM v3.1.0
 * Módulo de Exportação ZIP Simplificado - Apenas Fotos + TXT
 * @module zip-export
 */

class ZipExportManager {
    constructor() {
        this.photoManagers = {};
        this.identification = { local: '', om: '', tag: '' };
        this._isDestroyed = false;
        this._debug = true;
        this._initialized = false;
        this._processedPhotoKeys = new Set(); // Para evitar duplicação
        
        this._log('🔧 ZipExportManager instanciado - Modo Simplificado');
        this._initialized = true;
    }

    _log(message, data = null) {
        if (this._debug) {
            if (data) {
                console.log(`[ZipExport] ${message}`, data);
            } else {
                console.log(`[ZipExport] ${message}`);
            }
        }
    }

    _error(message, error = null) {
        console.error(`[ZipExport] ❌ ${message}`, error || '');
    }

    _warn(message, data = null) {
        console.warn(`[ZipExport] ⚠️ ${message}`, data || '');
    }

    isInitialized() {
        return this._initialized && !this._isDestroyed;
    }

    /**
     * Registra um manager de fotos
     */
    registerPhotoManager(key, manager) {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return;
        }
        if (manager && typeof manager.getPhotosData === 'function') {
            this.photoManagers[key] = manager;
            this._log(`✅ Manager de fotos registrado: ${key}`);
        } else {
            this._warn(`⚠️ Manager inválido para chave: ${key}`);
        }
    }

    /**
     * Atualiza identificação
     */
    setIdentification(identification) {
        if (this._isDestroyed) return;
        this.identification = { ...identification };
        this._log('📋 Identificação atualizada:', this.identification);
    }

    /**
     * Coleta todos os dados para exportação - SEM DUPLICAÇÃO
     */
    collectAllData() {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            return null;
        }
        
        this._log('📊 Coletando dados para exportação...');
        this._processedPhotoKeys = new Set(); // Resetar para cada exportação
        
        const managers = {
            gnss: window.gnssForm,
            cftv: window.cftvForm,
            radio: window.radioForm,
            plc: window.plcForm,
            switch: window.switchForm
        };

        const result = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: CONFIG?.VERSION || '3.1.0',
                system: CONFIG?.SYSTEM_NAME || 'Inspection Form'
            },
            identification: { ...this.identification },
            forms: {},
            fotos: {}
        };

        // Coletar dados dos formulários - PRIORIDADE 1
        Object.entries(managers).forEach(([type, manager]) => {
            if (manager && typeof manager.getData === 'function') {
                try {
                    const data = manager.getData();
                    result.forms[type] = data;
                    
                    // Extrair fotos do formulário - APENAS se não houver photos registrados
                    if (data && data.fotos && data.fotos.length > 0) {
                        const key = `${type}_evidencias`;
                        // Verificar se já existe via photoManagers
                        if (!this.photoManagers[key] || this.photoManagers[key].getCount() === 0) {
                            result.fotos[type] = data.fotos;
                            this._processedPhotoKeys.add(type);
                            this._log(`📷 ${data.fotos.length} fotos encontradas em ${type} (via formulário)`);
                        } else {
                            this._log(`⚠️ ${type} já tem fotos registradas via manager, ignorando duplicação`);
                        }
                    }
                } catch (error) {
                    this._error(`❌ Erro ao coletar dados de ${type}`, error);
                    result.forms[type] = { items: [] };
                }
            } else {
                result.forms[type] = { items: [] };
                this._log(`⚠️ Manager ${type} não disponível`);
            }
        });

        // Coletar fotos registradas diretamente - PRIORIDADE 2 (não sobrescreve)
        Object.entries(this.photoManagers).forEach(([key, manager]) => {
            if (manager && typeof manager.getPhotosData === 'function') {
                try {
                    const photos = manager.getPhotosData();
                    if (photos && photos.length > 0) {
                        // Extrair o tipo do form do key (ex: gnss_evidencias -> gnss)
                        const formType = key.replace('_evidencias', '');
                        
                        // Verificar se já não foi adicionado via formulário
                        if (!this._processedPhotoKeys.has(formType)) {
                            // Usar a chave original para diferenciar se necessário
                            const targetKey = key.includes('_evidencias') ? formType : key;
                            result.fotos[targetKey] = photos;
                            this._processedPhotoKeys.add(formType);
                            this._log(`📷 ${photos.length} fotos registradas em ${key} (via manager)`);
                        } else {
                            this._log(`⚠️ ${formType} já processado, ignorando duplicação do manager ${key}`);
                        }
                    }
                } catch (error) {
                    this._error(`❌ Erro ao coletar fotos de ${key}`, error);
                }
            }
        });

        this._log(`✅ Dados coletados: ${Object.keys(result.forms).length} formulários, ${Object.keys(result.fotos).length} grupos de fotos`);
        return result;
    }

    /**
     * Gera o relatório TXT completo
     */
    generateTXTReport(data) {
        if (!data) {
            this._error('❌ Dados inválidos para gerar relatório');
            return this._getErrorTXT();
        }
        
        this._log('📄 Gerando relatório TXT...');
        
        try {
            const now = new Date(data.metadata?.exportedAt || Date.now());
            const identification = data.identification || { local: '', om: '', tag: '' };
            const forms = data.forms || {};

            const lines = [];
            const separator = '='.repeat(70);
            const subSeparator = '-'.repeat(50);

            // Cabeçalho
            lines.push(separator);
            lines.push(`        INSPECTION FORM - RELATÓRIO DE INSPEÇÃO INDUSTRIAL`);
            lines.push(separator);
            lines.push(`📅 Data: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
            lines.push(`📁 Sistema: ${CONFIG?.SYSTEM_NAME || 'Industrial Inspection System'} v${CONFIG?.VERSION || '3.1.0'}`);
            lines.push('');

            // Identificação
            lines.push(subSeparator);
            lines.push('📋 DADOS DE IDENTIFICAÇÃO DA INSPEÇÃO');
            lines.push(subSeparator);
            lines.push(`📍 LOCAL: ${identification.local || 'Não informado'}`);
            lines.push(`📄 OM: ${identification.om || 'Não informado'}`);
            lines.push(`🏷️ TAG: ${identification.tag || 'Não informado'}`);
            lines.push('');

            // Seções
            const sections = {
                gnss: { name: 'GNSS - Sistema de Navegação Global por Satélite', icon: '🛰️' },
                cftv: { name: 'CFTV - Circuito Fechado de Televisão', icon: '📷' },
                radio: { name: 'RÁDIO - Comunicação Digital', icon: '📡' },
                plc: { name: 'PLC - Controlador Lógico Programável', icon: '⚙️' },
                switch: { name: 'SWITCH - Switch Industrial', icon: '🔌' }
            };

            let totalOK = 0;
            let totalNOK = 0;

            Object.entries(sections).forEach(([key, section]) => {
                const form = forms[key] || { items: [] };
                const items = form.items || [];

                lines.push('');
                lines.push(`▸ ${section.icon} ${section.name}`);
                lines.push(subSeparator);

                if (items.length > 0) {
                    items.forEach(item => {
                        if (item.status) {
                            const statusIcon = item.status === 'OK' ? '✅' : '❌';
                            if (item.status === 'OK') totalOK++;
                            if (item.status === 'NOK') totalNOK++;
                            
                            lines.push(`  ${statusIcon} ITEM ${String(item.number).padStart(2, '0')}: ${item.title}`);
                            lines.push(`     Status: ${item.status}`);
                            if (item.annotations && item.annotations.trim()) {
                                lines.push(`     📝 Obs: ${item.annotations}`);
                            }
                            lines.push('');
                        }
                    });
                } else {
                    lines.push(`  📭 Nenhum dado registrado`);
                }
            });

            // Resumo Final
            lines.push('');
            lines.push(separator);
            lines.push('📊 RESUMO FINAL DA INSPEÇÃO');
            lines.push(separator);
            lines.push(`✅ Total de itens CONFORMES: ${totalOK}`);
            lines.push(`❌ Total de itens NÃO CONFORMES: ${totalNOK}`);
            lines.push('');

            if (totalNOK === 0) {
                lines.push('🎉 NENHUMA NÃO CONFORMIDADE REGISTRADA');
            } else {
                lines.push('⚠️ ATENÇÃO: Existem não conformidades que devem ser tratadas.');
                lines.push('');
                lines.push('📋 RECOMENDAÇÕES:');
                lines.push('  1. Revise cada item com status NÃO CONFORME');
                lines.push('  2. Registre as ações corretivas necessárias');
                lines.push('  3. Agende nova inspeção após as correções');
            }

            lines.push('');
            lines.push(separator);
            lines.push(`🏁 FIM DO RELATÓRIO - Gerado em ${now.toLocaleString('pt-BR')}`);
            lines.push(separator);

            this._log('✅ Relatório TXT gerado com sucesso');
            return lines.join('\n');
        } catch (error) {
            this._error('❌ Erro ao gerar relatório TXT', error);
            return this._getErrorTXT();
        }
    }

    _getErrorTXT() {
        return `
======================================================================
        ERRO AO GERAR RELATÓRIO
======================================================================
❌ Ocorreu um erro ao gerar o relatório.

Por favor, tente novamente ou entre em contato com o suporte.

Erro: Dados inválidos ou incompletos.
======================================================================
`;
    }

    /**
     * Verifica se o JSZip está disponível
     */
    _isJSZipAvailable() {
        return typeof JSZip !== 'undefined';
    }

    /**
     * Exporta o ZIP com fotos e relatório TXT
     */
    async exportZip(onProgress) {
        if (this._isDestroyed) {
            this._error('❌ Manager destruído');
            window.showToast?.('❌ Erro ao exportar ZIP', 'error', 3000);
            return false;
        }

        this._log('📦 Iniciando exportação ZIP simplificada...');

        try {
            const data = this.collectAllData();
            if (!data) {
                this._error('❌ Falha ao coletar dados');
                window.showToast?.('❌ Erro ao coletar dados', 'error', 3000);
                return false;
            }

            const local = data.identification?.local || 'inspecao';
            const filename = `inspecao_${local}_${formatDateForFilename()}.zip`;

            // Verificar se há fotos
            const totalPhotos = Object.values(data.fotos || {}).flat().length;
            if (totalPhotos === 0) {
                this._log('⚠️ Nenhuma foto encontrada');
                const confirm = window.confirm('⚠️ Nenhuma foto adicionada. Deseja exportar o ZIP apenas com o relatório TXT?');
                if (!confirm) return false;
            }

            if (this._isJSZipAvailable()) {
                this._log('📦 Usando JSZip para criar ZIP');
                return await this._exportWithJSZip(data, filename, onProgress);
            } else {
                this._log('⚠️ JSZip não disponível, usando fallback');
                window.showToast?.('📄 JSZip não disponível. Baixando apenas o relatório TXT.', 'info', 4000);
                return await this._exportFallback(data, filename, onProgress);
            }
        } catch (error) {
            this._error('❌ Erro ao exportar ZIP', error);
            window.showToast?.('❌ Erro ao gerar ZIP. Tente novamente.', 'error', 4000);
            return false;
        }
    }

    /**
     * Exportação usando JSZip - SEM DUPLICAÇÃO
     */
    async _exportWithJSZip(data, filename, onProgress) {
        try {
            this._log('📦 Criando ZIP com JSZip...');
            const zip = new JSZip();

            // Adicionar relatório TXT
            const txtReport = this.generateTXTReport(data);
            zip.file('relatorio_inspecao.txt', txtReport);
            this._log('✅ relatorio_inspecao.txt adicionado');

            // Adicionar fotos - usando Set para evitar duplicação
            let photoCount = 0;
            const allPhotos = Object.values(data.fotos || {}).flat();
            const totalPhotos = allPhotos.length;
            
            // Usar um Set para rastrear URLs de fotos já adicionadas
            const addedPhotoUrls = new Set();
            
            this._log(`📷 Adicionando ${totalPhotos} fotos ao ZIP...`);

            Object.entries(data.fotos || {}).forEach(([formType, fotos]) => {
                const folder = `fotos/${formType}`;
                fotos.forEach((foto, idx) => {
                    try {
                        // Criar uma chave única para evitar duplicação
                        const photoKey = foto.dataUrl || foto.id || `${formType}_${idx}`;
                        
                        if (addedPhotoUrls.has(photoKey)) {
                            this._log(`⚠️ Foto duplicada ignorada: ${foto.name || 'foto'}`);
                            return;
                        }
                        
                        addedPhotoUrls.add(photoKey);
                        
                        const safeName = (foto.name || `evidencia_${idx + 1}.jpg`).replace(/[^a-zA-Z0-9.]/g, '_');
                        const base64Data = foto.dataUrl ? foto.dataUrl.split(',')[1] : '';
                        if (base64Data) {
                            zip.file(`${folder}/${idx + 1}_${safeName}`, base64Data, { base64: true });
                            photoCount++;
                            if (onProgress && totalPhotos > 0) {
                                onProgress(Math.min(100, (photoCount / totalPhotos) * 100));
                            }
                        }
                    } catch (error) {
                        this._error(`❌ Erro ao adicionar foto ${idx + 1}`, error);
                    }
                });
            });

            this._log(`✅ ${photoCount}/${totalPhotos} fotos adicionadas (${totalPhotos - photoCount} duplicadas ignoradas)`);

            // Gerar ZIP
            this._log('🔄 Gerando arquivo ZIP...');
            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            this._log(`✅ ZIP exportado com sucesso! (${photoCount} fotos únicas)`);
            window.showToast?.(`✅ ZIP exportado com sucesso! (${photoCount} fotos)`, 'success', 4000);
            return true;
        } catch (error) {
            this._error('❌ Erro na exportação com JSZip', error);
            window.showToast?.('❌ Erro ao gerar ZIP. Tente novamente.', 'error', 4000);
            return false;
        }
    }

    /**
     * Fallback quando JSZip não está disponível
     */
    async _exportFallback(data, filename, onProgress) {
        try {
            this._log('📦 Usando fallback (download separado)...');
            
            const txtReport = this.generateTXTReport(data);

            // Baixar TXT
            const txtBlob = new Blob([txtReport], { type: 'text/plain;charset=utf-8' });
            const txtUrl = URL.createObjectURL(txtBlob);
            const txtLink = document.createElement('a');
            txtLink.href = txtUrl;
            txtLink.download = 'relatorio_inspecao.txt';
            document.body.appendChild(txtLink);
            txtLink.click();
            document.body.removeChild(txtLink);
            setTimeout(() => URL.revokeObjectURL(txtUrl), 5000);
            this._log('✅ relatorio_inspecao.txt baixado');

            window.showToast?.('📄 Relatório TXT baixado com sucesso!', 'success', 3000);
            return true;
        } catch (error) {
            this._error('❌ Erro no fallback de exportação', error);
            window.showToast?.('❌ Erro ao exportar. Tente novamente.', 'error', 4000);
            return false;
        }
    }

    /**
     * Destroi o manager
     */
    destroy() {
        if (this._isDestroyed) return;
        this._log('🧹 Destruindo ZipExportManager...');
        this._isDestroyed = true;
        this._initialized = false;
        this.photoManagers = {};
        this.identification = { local: '', om: '', tag: '' };
        this._processedPhotoKeys = new Set();
        this._log('✅ ZipExportManager destruído');
    }
}

// ==========================================================================
// INICIALIZAÇÃO ROBUSTA
// ==========================================================================

let zipExportManager = null;
let _zipInitAttempts = 0;
const _maxZipInitAttempts = 10;

/**
 * Tenta inicializar o ZipExportManager com múltiplas tentativas
 */
function initZipExport() {
    _zipInitAttempts++;
    
    try {
        if (window.zipExportManager && window.zipExportManager.isInitialized && window.zipExportManager.isInitialized()) {
            console.log('✅ [ZipExport] Manager já inicializado');
            return;
        }

        if (typeof CONFIG === 'undefined') {
            console.warn(`⚠️ [ZipExport] CONFIG não disponível (tentativa ${_zipInitAttempts})`);
            if (_zipInitAttempts < _maxZipInitAttempts) {
                setTimeout(initZipExport, 300);
            }
            return;
        }

        zipExportManager = new ZipExportManager();
        window.zipExportManager = zipExportManager;
        
        console.log('✅ [ZipExport] Manager inicializado com sucesso');
        
        if (window.App && window.App.state && window.App.state.photoManagers) {
            Object.entries(window.App.state.photoManagers).forEach(([type, manager]) => {
                if (manager && manager.initialized) {
                    zipExportManager.registerPhotoManager(`${type}_evidencias`, manager);
                }
            });
            console.log(`✅ [ZipExport] ${Object.keys(window.App.state.photoManagers).length} managers de fotos registrados`);
        }
        
    } catch (error) {
        console.error(`❌ [ZipExport] Erro ao inicializar (tentativa ${_zipInitAttempts}):`, error);
        if (_zipInitAttempts < _maxZipInitAttempts) {
            setTimeout(initZipExport, 500);
        }
    }
}

// Aguardar DOM carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 [ZipExport] DOM carregado, iniciando inicialização...');
    setTimeout(initZipExport, 100);
});

if (window.App && window.App.state && window.App.state.isInitialized) {
    setTimeout(initZipExport, 200);
}

window.initZipExport = initZipExport;
window.ZipExportManager = ZipExportManager;

console.log('📦 [ZipExport] Módulo carregado. Aguardando inicialização...');