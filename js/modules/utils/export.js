/**
 * INSPECTION FORM - MÓDULO DE EXPORTAÇÃO */

class ExportManager {
    constructor() {
        this.formData = { gnss: null, cftv: null, radio: null, plc: null };
    }
    
    collectAllData() {
        if (window.gnssFormData) this.formData.gnss = window.gnssFormData.getData();
        if (window.cftvFormData) this.formData.cftv = window.cftvFormData.getData();
        if (window.radioFormData) this.formData.radio = window.radioFormData.getData();
        if (window.plcFormData) this.formData.plc = window.plcFormData.getData();
        return this.formData;
    }
    
    generateReportContent() {
        const data = this.collectAllData();
        const now = new Date();
        const lines = [];
        
        lines.push('=' .repeat(70));
        lines.push('INSPECTION FORM - RELATÓRIO DE INSPEÇÃO INDUSTRIAL');
        lines.push('=' .repeat(70));
        lines.push(`Data: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
        lines.push(`Versão: ${CONFIG.VERSION}`);
        lines.push('-'.repeat(70));
        lines.push('');
        
        lines.push(...this.generateSectionReport('GNSS', data.gnss));
        lines.push('');
        lines.push(...this.generateSectionReport('CFTV', data.cftv));
        lines.push('');
        lines.push(...this.generateSectionReport('RÁDIO', data.radio));
        lines.push('');
        lines.push(...this.generateSectionReport('PLC', data.plc));
        lines.push('');
        
        lines.push('=' .repeat(70));
        lines.push('FIM DO RELATÓRIO');
        lines.push('=' .repeat(70));
        
        return lines.join('\n');
    }
    
    generateSectionReport(sectionName, data) {
        const lines = [];
        
        if (!data || !data.items || data.items.length === 0) {
            lines.push(`[${sectionName}] Nenhum dado disponível`);
            return lines;
        }
        
        lines.push(`▸ ${sectionName}`);
        lines.push('-'.repeat(50));
        
        data.items.forEach(item => {
            if (item.status) {
                lines.push(`${String(item.number).padStart(2, '0')}. ${item.title}`);
                lines.push(`   Status: ${item.status}`);
                if (item.annotations && item.annotations.trim()) {
                    lines.push(`   Obs: ${item.annotations}`);
                }
                lines.push('');
            }
        });
        
        // Dados especiais
        if (sectionName === 'RÁDIO' && data.alarms) {
            const alarms = [];
            if (data.alarms.ber) alarms.push(`BER: ${data.alarms.ber}`);
            if (data.alarms.rssi) alarms.push(`RSSI: ${data.alarms.rssi} dBm`);
            if (data.alarms.snr) alarms.push(`SNR: ${data.alarms.snr} dB`);
            if (data.alarms.throughput) alarms.push(`Throughput: ${data.alarms.throughput} Mbps`);
            if (alarms.length) lines.push(`Métricas: ${alarms.join(' | ')}`);
        }
        
        if (sectionName === 'PLC' && data.leds) {
            const leds = [];
            if (data.leds.fontes) leds.push(`Fontes: ${data.leds.fontes}`);
            if (data.leds.comunicacao) leds.push(`Comunicação: ${data.leds.comunicacao}`);
            if (data.leds.io) leds.push(`I/O: ${data.leds.io}`);
            if (data.leds.bateria) leds.push(`Bateria: ${data.leds.bateria}`);
            if (data.leds.ozd) leds.push(`OZD: ${data.leds.ozd}`);
            if (leds.length) lines.push(`LEDs: ${leds.join(' | ')}`);
        }
        
        return lines;
    }
    
    generateSummaryReport() {
        const data = this.collectAllData();
        const lines = [];
        
        lines.push('=' .repeat(70));
        lines.push('RESUMO DE NÃO CONFORMIDADES');
        lines.push('=' .repeat(70));
        lines.push('');
        
        const sections = [
            { name: 'GNSS', data: data.gnss },
            { name: 'CFTV', data: data.cftv },
            { name: 'RÁDIO', data: data.radio },
            { name: 'PLC', data: data.plc }
        ];
        
        let totalNOK = 0;
        
        sections.forEach(section => {
            if (!section.data || !section.data.items) return;
            const nokItems = section.data.items.filter(item => item.status === 'NOK');
            totalNOK += nokItems.length;
            
            if (nokItems.length > 0) {
                lines.push(`【${section.name}】 - ${nokItems.length} não conformidade(s)`);
                lines.push('-'.repeat(40));
                nokItems.forEach(item => {
                    lines.push(`  • Item ${item.number}: ${item.title}`);
                    if (item.annotations) {
                        lines.push(`    Obs: ${item.annotations.substring(0, 100)}`);
                    }
                });
                lines.push('');
            }
        });
        
        if (totalNOK === 0) {
            lines.push('✅ NENHUMA NÃO CONFORMIDADE REGISTRADA');
        } else {
            lines.push(`📊 TOTAL DE NÃO CONFORMIDADES: ${totalNOK}`);
        }
        
        lines.push('');
        lines.push('=' .repeat(70));
        
        return lines.join('\n');
    }
    
    downloadReport(type = 'full') {
        const content = type === 'summary' ? this.generateSummaryReport() : this.generateReportContent();
        const filename = `${CONFIG.EXPORT.filenamePrefix}_${type}_${formatDateForFilename()}.txt`;
        
        // Verificar se há dados
        const hasAnyData = Object.values(this.formData).some(data => 
            data && data.items && data.items.some(item => item.status)
        );
        
        if (CONFIG.VALIDATION.warnOnEmptyExport && !hasAnyData) {
            if (window.showToast) window.showToast('Nenhum dado preenchido.', 'warning');
        }
        
        const blob = new Blob([content], { type: `${CONFIG.EXPORT.mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.showToast) window.showToast(`Relatório exportado! (${type === 'summary' ? 'Resumo' : 'Completo'})`, 'success');
        return true;
    }
    
    exportJSON() {
        const data = this.collectAllData();
        const filename = `${CONFIG.EXPORT.filenamePrefix}_dados_${formatDateForFilename()}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.showToast) window.showToast('Dados JSON exportados!', 'success');
    }
}

const exportManager = new ExportManager();
window.ExportManager = ExportManager;
window.exportManager = exportManager;