/**
 * INSPECTION FORM v3.1.0
 * Módulo de Exportação ZIP com Fotos por Formulário
 * @module zip-export
 */

class ZipExportManager {
    constructor() {
        this.photoManagers = {};
        this.identification = { local: '', om: '', tag: '' };
    }

    registerPhotoManager(key, manager) {
        if (manager && typeof manager.getPhotosData === 'function') {
            this.photoManagers[key] = manager;
            console.log(`[ZipExport] Manager de fotos registrado: ${key}`);
        }
    }

    setIdentification(identification) {
        this.identification = { ...identification };
    }

    collectAllData() {
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
                version: CONFIG.VERSION,
                system: CONFIG.SYSTEM_NAME
            },
            identification: { ...this.identification },
            forms: {},
            fotos: {}
        };

        Object.entries(managers).forEach(([type, manager]) => {
            if (manager && typeof manager.getData === 'function') {
                const data = manager.getData();
                result.forms[type] = data;
                if (data.fotos) {
                    result.fotos[type] = data.fotos;
                }
            }
        });

        Object.entries(this.photoManagers).forEach(([key, manager]) => {
            if (manager && typeof manager.getPhotosData === 'function') {
                const photos = manager.getPhotosData();
                if (photos && photos.length > 0) {
                    result.fotos[key] = photos;
                }
            }
        });

        return result;
    }

    generateHTMLReport(data) {
        const now = new Date(data.metadata.exportedAt);
        const sections = {
            gnss: { name: 'GNSS - Sistema de Navegação Global por Satélite', icon: '🛰️' },
            cftv: { name: 'CFTV - Circuito Fechado de Televisão', icon: '📷' },
            radio: { name: 'RÁDIO - Comunicação Digital', icon: '📡' },
            plc: { name: 'PLC - Controlador Lógico Programável', icon: '⚙️' },
            switch: { name: 'SWITCH - Switch Industrial', icon: '🔌' }
        };

        let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Inspeção - ${data.identification.local || 'Industrial'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f4f6f8;
            color: #1a1a2e;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #002b3b, #006994);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 28px; font-weight: 700; }
        .header .subtitle { opacity: 0.8; margin-top: 8px; }
        .header .meta { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; font-size: 14px; }
        .header .meta span { background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; }
        .identification {
            background: white;
            padding: 20px 24px;
            border-radius: 8px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
        }
        .identification .field { display: flex; align-items: center; gap: 8px; }
        .identification .field .label { font-weight: 600; color: #5a6a7a; }
        .identification .field .value { font-weight: 500; }
        .section {
            background: white;
            border-radius: 8px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
            overflow: hidden;
        }
        .section-header {
            background: #f8f9fa;
            padding: 16px 24px;
            border-bottom: 2px solid #e5e7eb;
            font-weight: 600;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .section-body { padding: 20px 24px; }
        .item {
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .item:last-child { border-bottom: none; }
        .item .status {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
        }
        .item .status.ok { background: #ecfdf5; color: #10b981; }
        .item .status.nok { background: #fef2f2; color: #ef4444; }
        .item .status.pending { background: #f1f5f9; color: #94a3b8; }
        .item .content { flex: 1; }
        .item .content .title { font-weight: 500; }
        .item .content .annotation {
            font-size: 14px;
            color: #5a6a7a;
            margin-top: 4px;
            padding: 6px 12px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .item .content .annotation .label { font-weight: 500; color: #1a1a2e; }
        .fotos-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 2px solid #e5e7eb;
        }
        .fotos-section h4 {
            font-size: 14px;
            color: #5a6a7a;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .fotos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 8px;
        }
        .fotos-grid .foto {
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            aspect-ratio: 1;
            background: #f8f9fa;
        }
        .fotos-grid .foto img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .footer {
            text-align: center;
            padding: 24px;
            color: #94a3b8;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
            margin-top: 24px;
        }
        .summary {
            background: white;
            border-radius: 8px;
            padding: 20px 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
        }
        .summary .stat { text-align: center; }
        .summary .stat .number { font-size: 28px; font-weight: 700; color: #006994; }
        .summary .stat .label { font-size: 14px; color: #5a6a7a; }
        @media (max-width: 600px) {
            body { padding: 16px; }
            .header { padding: 24px; }
            .header h1 { font-size: 22px; }
            .identification { flex-direction: column; gap: 8px; }
            .section-body { padding: 16px; }
            .fotos-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
        }
        @media print {
            body { background: white; padding: 20px; }
            .section { box-shadow: none; border: 1px solid #ddd; }
            .header { background: #002b3b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Relatório de Inspeção Industrial</h1>
            <div class="subtitle">${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}</div>
            <div class="meta">
                <span>📅 ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</span>
                <span>📁 ${data.identification.local || 'Local não informado'}</span>
            </div>
        </div>

        <div class="identification">
            <div class="field"><span class="label">📍 LOCAL:</span><span class="value">${data.identification.local || '—'}</span></div>
            <div class="field"><span class="label">📄 OM:</span><span class="value">${data.identification.om || '—'}</span></div>
            <div class="field"><span class="label">🏷️ TAG:</span><span class="value">${data.identification.tag || '—'}</span></div>
        </div>`;

        let totalOK = 0, totalNOK = 0;
        Object.entries(sections).forEach(([key, section]) => {
            const form = data.forms[key];
            if (form?.items) {
                totalOK += form.items.filter(i => i.status === 'OK').length;
                totalNOK += form.items.filter(i => i.status === 'NOK').length;
            }
        });

        html += `
        <div class="summary">
            <div class="stat"><div class="number">${totalOK + totalNOK}</div><div class="label">Total Itens</div></div>
            <div class="stat"><div class="number" style="color:#10b981">${totalOK}</div><div class="label">✅ Conformes</div></div>
            <div class="stat"><div class="number" style="color:#ef4444">${totalNOK}</div><div class="label">❌ Não Conformes</div></div>
        </div>`;

        Object.entries(sections).forEach(([key, section]) => {
            const form = data.forms[key];
            const fotos = data.fotos[key] || [];

            html += `
        <div class="section">
            <div class="section-header">${section.icon} ${section.name}</div>
            <div class="section-body">`;

            if (form?.items?.length) {
                form.items.forEach(item => {
                    const statusClass = item.status === 'OK' ? 'ok' : item.status === 'NOK' ? 'nok' : 'pending';
                    const statusLabel = item.status || '—';
                    html += `
                <div class="item">
                    <div class="status ${statusClass}">${statusLabel === 'OK' ? '✓' : statusLabel === 'NOK' ? '✗' : '?'}</div>
                    <div class="content">
                        <div class="title">ITEM ${String(item.number).padStart(2, '0')}: ${item.title}</div>
                        ${item.annotations ? `<div class="annotation"><span class="label">📝 Obs:</span> ${item.annotations}</div>` : ''}
                    </div>
                </div>`;
                });
            } else {
                html += `<p style="color:#94a3b8; padding: 8px 0;">Nenhum dado registrado</p>`;
            }

            if (fotos.length) {
                html += `
                <div class="fotos-section">
                    <h4><i class="fas fa-camera"></i> Evidências Fotográficas (${fotos.length})</h4>
                    <div class="fotos-grid">`;
                fotos.forEach((foto, idx) => {
                    html += `
                        <div class="foto">
                            <img src="${foto.dataUrl}" alt="Evidência ${idx + 1}" loading="lazy">
                        </div>`;
                });
                html += `
                    </div>
                </div>`;
            }

            html += `
            </div>
        </div>`;
        });

        html += `
        <div class="footer">
            Relatório gerado automaticamente por ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION} · ${new Date().toLocaleString('pt-BR')}
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    async exportZip(onProgress) {
        const data = this.collectAllData();
        const local = data.identification.local || 'inspecao';
        const filename = `inspecao_${local}_${formatDateForFilename()}.zip`;

        if (typeof JSZip !== 'undefined') {
            return this._exportWithJSZip(data, filename, onProgress);
        } else {
            return this._exportFallback(data, filename, onProgress);
        }
    }

    async _exportWithJSZip(data, filename, onProgress) {
        const zip = new JSZip();

        const html = this.generateHTMLReport(data);
        zip.file('relatorio_inspecao.html', html);

        const jsonData = JSON.stringify(data, null, 2);
        zip.file('dados.json', jsonData);

        let photoCount = 0;
        const allPhotos = Object.values(data.fotos).flat();
        const totalPhotos = allPhotos.length;

        Object.entries(data.fotos).forEach(([formType, fotos]) => {
            const folder = `fotos/${formType}`;
            fotos.forEach((foto, idx) => {
                const safeName = foto.name.replace(/[^a-zA-Z0-9.]/g, '_') || `evidencia_${idx + 1}.jpg`;
                zip.file(`${folder}/${idx + 1}_${safeName}`,
                    foto.dataUrl.split(',')[1],
                    { base64: true }
                );
                photoCount++;
                if (onProgress) {
                    onProgress((photoCount / totalPhotos) * 100);
                }
            });
        });

        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        window.showToast?.(`ZIP exportado com sucesso! (${photoCount} fotos)`, 'success', 4000);
        return true;
    }

    async _exportFallback(data, filename, onProgress) {
        const html = this.generateHTMLReport(data);
        const json = JSON.stringify(data, null, 2);

        const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const htmlLink = document.createElement('a');
        htmlLink.href = htmlUrl;
        htmlLink.download = 'relatorio_inspecao.html';
        document.body.appendChild(htmlLink);
        htmlLink.click();
        document.body.removeChild(htmlLink);
        setTimeout(() => URL.revokeObjectURL(htmlUrl), 5000);

        setTimeout(() => {
            const jsonBlob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.download = 'dados.json';
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);
            setTimeout(() => URL.revokeObjectURL(jsonUrl), 5000);
        }, 1000);

        window.showToast?.('Relatório HTML e JSON baixados separadamente (instale JSZip para ZIP completo)', 'info', 5000);
        return true;
    }
}

window.ZipExportManager = ZipExportManager;