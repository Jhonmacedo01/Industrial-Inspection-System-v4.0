/**
 * INSPECTION FORM v3.1.0
 * Módulo de Exportação de Relatórios - COM LOCAL, OM, TAG
 * @module export-manager
 */

class ExportManager {
    constructor() {
        this.separator = '='.repeat(72);
        this.subSeparator = '-'.repeat(52);
        this._identification = { local: '', om: '', tag: '' };
        this._loadIdentification();
    }

    _loadIdentification() {
        try {
            const raw = localStorage.getItem('inspform_identification');
            if (raw) {
                const data = JSON.parse(raw);
                this._identification = { local: data.local || '', om: data.om || '', tag: data.tag || '' };
            }
        } catch (e) {
            console.warn('Erro ao carregar identificação:', e);
        }
    }

    setIdentification(identification) {
        this._identification = { ...identification };
    }

    getIdentification() {
        return { ...this._identification };
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
            _identification: { ...this._identification },
            _metadata: {
                exportedAt: new Date().toISOString(),
                version: CONFIG.VERSION,
                system: CONFIG.SYSTEM_NAME
            }
        };
        
        Object.entries(managers).forEach(([type, manager]) => {
            result[type] = (manager && typeof manager.getData === 'function')
                ? manager.getData()
                : { items: [] };
        });
        
        return result;
    }

    _generateIdentificationHeader() {
        const lines = [];
        const hasAny = this._identification.local || this._identification.om || this._identification.tag;
        
        if (hasAny) {
            lines.push(this.subSeparator);
            lines.push('📋 DADOS DE IDENTIFICAÇÃO DA INSPEÇÃO');
            lines.push(this.subSeparator);
            if (this._identification.local) lines.push(`📍 LOCAL: ${this._identification.local}`);
            if (this._identification.om) lines.push(`📄 OM: ${this._identification.om}`);
            if (this._identification.tag) lines.push(`🏷️ TAG: ${this._identification.tag}`);
            lines.push('');
        }
        
        return lines;
    }

    generateFullReport() {
        this._loadIdentification();
        const data = this.collectAllData();
        const now = new Date();
        const lines = [];

        lines.push(this.separator);
        lines.push(`INSPECTION FORM v${CONFIG.VERSION} - RELATÓRIO DE INSPEÇÃO INDUSTRIAL`);
        lines.push(this.separator);
        lines.push(`📅 Data: ${now.toLocaleDateString('pt-BR')}  ${now.toLocaleTimeString('pt-BR')}`);
        lines.push(`💻 Sistema: ${CONFIG.SYSTEM_NAME}`);
        lines.push(`🎨 Tema: ${CONFIG.THEME}`);
        lines.push('');
        
        lines.push(...this._generateIdentificationHeader());
        
        const sections = [
            { key: 'gnss', name: 'GNSS - Sistema de Navegação Global por Satélite', icon: '🛰️' },
            { key: 'cftv', name: 'CFTV - Circuito Fechado de Televisão', icon: '📷' },
            { key: 'radio', name: 'RÁDIO - Comunicação Digital', icon: '📡' },
            { key: 'plc', name: 'PLC - Controlador Lógico Programável', icon: '⚙️' },
            { key: 'switch', name: 'SWITCH - Switch Industrial', icon: '🔌' }
        ];

        sections.forEach(({ key, name, icon }) => {
            lines.push('');
            lines.push(`${icon} ${name}`);
            lines.push(...this._generateSectionReport(name, data[key], key));
        });

        lines.push('');
        lines.push(this.separator);
        lines.push('📊 RESUMO FINAL DA INSPEÇÃO');
        lines.push(this.subSeparator);
        
        if (this._identification.local || this._identification.om || this._identification.tag) {
            lines.push('📋 IDENTIFICAÇÃO:');
            if (this._identification.local) lines.push(`   LOCAL: ${this._identification.local}`);
            if (this._identification.om) lines.push(`   OM: ${this._identification.om}`);
            if (this._identification.tag) lines.push(`   TAG: ${this._identification.tag}`);
            lines.push('');
        }
        
        let totalOK = 0;
        let totalNOK = 0;
        const nokBySection = [];
        
        sections.forEach(({ key, name }) => {
            const sectionData = data[key];
            if (sectionData?.items) {
                const okCount = sectionData.items.filter(i => i.status === 'OK').length;
                const nokCount = sectionData.items.filter(i => i.status === 'NOK').length;
                totalOK += okCount;
                totalNOK += nokCount;
                if (nokCount > 0) {
                    nokBySection.push(`${name}: ${nokCount}`);
                }
            }
        });
        
        lines.push(`✅ Total de itens OK: ${totalOK}`);
        lines.push(`⚠️ Total de não conformidades: ${totalNOK}`);
        
        if (nokBySection.length > 0) {
            lines.push('');
            lines.push('📍 Não conformidades por seção:');
            nokBySection.forEach(item => lines.push(`   • ${item}`));
        } else if (totalNOK === 0) {
            lines.push('');
            lines.push('🎉 NENHUMA NÃO CONFORMIDADE REGISTRADA');
        }

        lines.push('');
        lines.push(this.separator);
        lines.push(`🏁 FIM DO RELATÓRIO - Gerado por ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
        lines.push(this.separator);

        return lines.join('\n');
    }

    generateSummaryReport() {
        this._loadIdentification();
        const data = this.collectAllData();
        const lines = [];

        lines.push(this.separator);
        lines.push(`INSPECTION FORM v${CONFIG.VERSION} - RESUMO DE NÃO CONFORMIDADES`);
        lines.push(this.separator);
        lines.push('');
        
        lines.push(...this._generateIdentificationHeader());

        const sections = [
            { key: 'gnss', name: 'GNSS' },
            { key: 'cftv', name: 'CFTV' },
            { key: 'radio', name: 'RÁDIO' },
            { key: 'plc', name: 'PLC' },
            { key: 'switch', name: 'SWITCH' }
        ];

        let totalNOK = 0;
        const allNOKItems = [];

        sections.forEach(({ key, name }) => {
            const sectionData = data[key];
            if (!sectionData?.items) return;

            const nokItems = sectionData.items.filter(item => item.status === 'NOK');
            if (nokItems.length === 0) return;

            totalNOK += nokItems.length;
            allNOKItems.push(...nokItems.map(item => ({ ...item, section: name })));
            
            lines.push(`▸ ${name}: ${nokItems.length} não conformidade(s)`);
            lines.push(this.subSeparator);

            nokItems.forEach(item => {
                lines.push(`  • ITEM ${String(item.number).padStart(2, '0')}: ${item.title}`);
                if (item.annotations?.trim()) {
                    lines.push(`    📝 OBS.: ${item.annotations}`);
                }
            });
            lines.push('');
        });

        if (totalNOK === 0) {
            lines.push(this.subSeparator);
            lines.push('✅ NENHUMA NÃO CONFORMIDADE REGISTRADA');
            lines.push(this.subSeparator);
        } else {
            lines.push(this.subSeparator);
            lines.push(`📊 TOTAL DE NÃO CONFORMIDADES: ${totalNOK}`);
            lines.push('');
            lines.push('📋 LISTA COMPLETA DE ITENS NÃO CONFORMES:');
            lines.push(this.subSeparator);
            
            allNOKItems.forEach((item, idx) => {
                lines.push(`${idx + 1}. [${item.section}] Item ${item.number}: ${item.title}`);
            });
        }

        lines.push('');
        lines.push(this.separator);
        lines.push(`🏁 FIM DO RESUMO - ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
        lines.push(this.separator);

        return lines.join('\n');
    }

    _generateSectionReport(sectionName, data, formKey) {
        const lines = [];

        if (!data?.items?.length) {
            lines.push(`  [${sectionName}] Sem dados registrados`);
            return lines;
        }

        lines.push(this.subSeparator);

        const regularItems = data.items.filter(i => !i.hasAlarms && !i.hasLeds && !i.hasOzd && !i.hasTemperature);
        const specialItems = data.items.filter(i => i.hasAlarms || i.hasLeds || i.hasOzd || i.hasTemperature);
        
        regularItems.forEach(item => {
            if (!item.status) return;
            const statusIcon = item.status === 'OK' ? '✅' : '❌';
            lines.push(`  ${statusIcon} ITEM ${String(item.number).padStart(2, '0')}: ${item.title}`);
            if (item.annotations?.trim()) {
                lines.push(`       📝 Obs: ${item.annotations}`);
            }
        });
        
        specialItems.forEach(item => {
            if (!item.status) return;
            const statusIcon = item.status === 'OK' ? '✅' : '❌';
            lines.push(`  ${statusIcon} ITEM ${String(item.number).padStart(2, '0')}: ${item.title}`);
            
            if (item.hasAlarms && data.alarms) {
                const metrics = [];
                if (data.alarms.ber) metrics.push(`BER: ${data.alarms.ber}`);
                if (data.alarms.rssi) metrics.push(`RSSI: ${data.alarms.rssi} dBm`);
                if (data.alarms.snr) metrics.push(`SNR: ${data.alarms.snr} dB`);
                if (data.alarms.throughput) metrics.push(`Throughput: ${data.alarms.throughput} Mbps`);
                if (metrics.length) {
                    lines.push(`       📊 Métricas: ${metrics.join(' | ')}`);
                }
            }
            
            if (item.hasLeds && data.leds) {
                const ledInfo = [];
                if (data.leds.fontes) ledInfo.push(`Fontes: ${data.leds.fontes}`);
                if (data.leds.comunicacao) ledInfo.push(`Comunicação: ${data.leds.comunicacao}`);
                if (data.leds.io) ledInfo.push(`I/O: ${data.leds.io}`);
                if (data.leds.bateria) ledInfo.push(`Bateria: ${data.leds.bateria}`);
                if (data.leds.ozd) ledInfo.push(`OZD: ${data.leds.ozd}`);
                if (ledInfo.length) {
                    lines.push(`       💡 LEDs: ${ledInfo.join(' | ')}`);
                }
            }
            
            if (item.hasTemperature && data.specialFields?.temperature) {
                const temp = data.specialFields.temperature;
                const tempStatus = parseFloat(temp) > 60 ? '⚠️ ALTA' : '✓ Normal';
                lines.push(`       🌡️ Temperatura: ${temp}°C (${tempStatus})`);
            }
            
            if (item.annotations?.trim()) {
                lines.push(`       📝 Obs: ${item.annotations}`);
            }
        });

        return lines;
    }

    exportJSON() {
        this._loadIdentification();
        const data = this.collectAllData();
        const payload = {
            metadata: {
                version: CONFIG.VERSION,
                exportedAt: new Date().toISOString(),
                system: CONFIG.SYSTEM_NAME,
                theme: CONFIG.THEME
            },
            identification: {
                local: this._identification.local,
                om: this._identification.om,
                tag: this._identification.tag
            },
            forms: {
                gnss: data.gnss,
                cftv: data.cftv,
                radio: data.radio,
                plc: data.plc,
                switch: data.switch
            }
        };
        return payload;
    }

    downloadReport(type = 'full') {
        this._loadIdentification();
        
        let content, filename;

        if (type === 'summary') {
            content = this.generateSummaryReport();
            filename = `${CONFIG.EXPORT.filenamePrefix}_resumo_nok_${formatDateForFilename()}.txt`;
        } else {
            content = this.generateFullReport();
            filename = `${CONFIG.EXPORT.filenamePrefix}_completo_${formatDateForFilename()}.txt`;
        }

        this._triggerDownload(content, filename, 'text/plain;charset=utf-8');
        window.showToast?.(
            `Relatório ${type === 'summary' ? 'de resumo' : 'completo'} exportado!`,
            'success'
        );
    }

    downloadJSON() {
        this._loadIdentification();
        const payload = this.exportJSON();
        const content = JSON.stringify(payload, null, 2);
        const filename = `${CONFIG.EXPORT.filenamePrefix}_dados_${formatDateForFilename()}.json`;
        this._triggerDownload(content, filename, 'application/json');
        window.showToast?.('Dados JSON exportados!', 'success');
    }

    _triggerDownload(content, filename, mimeType) {
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
    }
}

let exportManager = null;
document.addEventListener('DOMContentLoaded', () => {
    exportManager = new ExportManager();
    window.exportManager = exportManager;
});

window.ExportManager = ExportManager;