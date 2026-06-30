/**
 * INSPECTION FORM v3.0.0
 * Módulo de Validação
 * @module validation
 */

class ValidationManager {
    constructor() {
        /** @type {Array<{field: string, message: string, severity: string}>} */
        this.issues = [];
    }

    /**
     * Valida um formulário completo
     * @param {string} formType - Tipo do formulário (gnss, cftv, radio, plc)
     * @param {Object} data - Dados do formulário
     * @returns {{ isValid: boolean, issues: Array, summary: Object }}
     */
    validate(formType, data) {
        this.issues = [];

        if (!data || !data.items) {
            return this._buildResult();
        }

        // Validar itens individuais
        data.items.forEach((item, index) => {
            this._validateItem(item, index, formType);
        });

        // Validações específicas por tipo
        switch (formType) {
            case 'radio':
                if (data.alarms) this._validateRadioAlarms(data.alarms);
                break;
            case 'plc':
                if (data.leds) this._validatePlcLeds(data.leds);
                break;
        }

        return this._buildResult();
    }

    /**
     * Valida um item individual
     * @private
     */
    _validateItem(item, index, formType) {
        const label = `Item ${index + 1}`;

        // Verificar se item NÃO OK tem anotações
        if (item.status === 'NOK' && (!item.annotations || item.annotations.trim() === '')) {
            this.issues.push({
                field: label,
                message: 'Status NÃO OK requer anotações obrigatórias',
                severity: 'warning'
            });
        }

        // Verificar tamanho máximo de anotações
        if (item.annotations && item.annotations.length > CONFIG.UI.maxAnnotationLength) {
            this.issues.push({
                field: label,
                message: `Anotações excedem ${CONFIG.UI.maxAnnotationLength} caracteres`,
                severity: 'warning'
            });
        }
    }

    /**
     * Valida campos de alarme do rádio
     * @private
     */
    _validateRadioAlarms(alarms) {
        const { VALIDATION } = CONFIG;

        // BER
        if (alarms.ber && alarms.ber.trim()) {
            const ber = parseFloat(alarms.ber);
            if (isNaN(ber) || ber < VALIDATION.berMin || ber > VALIDATION.berMax) {
                this.issues.push({
                    field: 'BER',
                    message: `Valor inválido. Deve estar entre ${VALIDATION.berMin} e ${VALIDATION.berMax}`,
                    severity: 'error'
                });
            } else if (ber > VALIDATION.berWarnThreshold) {
                this.issues.push({
                    field: 'BER',
                    message: `Valor elevado (${ber}). Recomendado < ${VALIDATION.berWarnThreshold}`,
                    severity: 'warning'
                });
            }
        }

        // RSSI
        if (alarms.rssi && alarms.rssi.trim()) {
            const rssi = parseInt(alarms.rssi, 10);
            if (isNaN(rssi) || rssi < VALIDATION.rssiMin || rssi > VALIDATION.rssiMax) {
                this.issues.push({
                    field: 'RSSI',
                    message: `Valor inválido. Deve estar entre ${VALIDATION.rssiMin} e ${VALIDATION.rssiMax} dBm`,
                    severity: 'error'
                });
            } else if (rssi < VALIDATION.rssiWarnThreshold) {
                this.issues.push({
                    field: 'RSSI',
                    message: `Sinal fraco (${rssi} dBm). Recomendado > ${VALIDATION.rssiWarnThreshold} dBm`,
                    severity: 'warning'
                });
            }
        }

        // SNR
        if (alarms.snr && alarms.snr.trim()) {
            const snr = parseFloat(alarms.snr);
            if (isNaN(snr) || snr < VALIDATION.snrMin || snr > VALIDATION.snrMax) {
                this.issues.push({
                    field: 'SNR',
                    message: `Valor inválido. Deve estar entre ${VALIDATION.snrMin} e ${VALIDATION.snrMax} dB`,
                    severity: 'error'
                });
            } else if (snr < VALIDATION.snrWarnThreshold) {
                this.issues.push({
                    field: 'SNR',
                    message: `SNR baixo (${snr} dB). Recomendado > ${VALIDATION.snrWarnThreshold} dB`,
                    severity: 'warning'
                });
            }
        }

        // Throughput (apenas validação de número positivo)
        if (alarms.throughput && alarms.throughput.trim()) {
            const tp = parseFloat(alarms.throughput);
            if (isNaN(tp) || tp < 0) {
                this.issues.push({
                    field: 'Throughput',
                    message: 'Valor inválido. Deve ser um número positivo',
                    severity: 'error'
                });
            }
        }
    }

    /**
     * Valida LEDs do PLC
     * @private
     */
    _validatePlcLeds(leds) {
        // Apenas registra se algum LED não foi avaliado (opcional)
        const ledFields = ['fontes', 'comunicacao', 'io', 'bateria', 'ozd'];
        const anyFilled = ledFields.some(field => leds[field]);
        if (!anyFilled) {
            this.issues.push({
                field: 'LEDs PLC',
                message: 'Nenhum LED foi avaliado',
                severity: 'info'
            });
        }
    }

    /**
     * Verifica se há dados em um formulário
     * @param {Object} formData - Dados do formulário
     * @returns {boolean}
     */
    static hasData(formData) {
        if (!formData) return false;

        const hasStatus = formData.items?.some(
            item => item.status === 'OK' || item.status === 'NOK'
        );
        const hasAnnotations = formData.items?.some(
            item => item.annotations?.trim()
        );
        const hasAlarms = formData.alarms && Object.values(formData.alarms).some(v => v?.trim());
        const hasLeds = formData.leds && Object.values(formData.leds).some(v => v);

        return !!(hasStatus || hasAnnotations || hasAlarms || hasLeds);
    }

    /**
     * Conta não conformidades
     * @param {Object} formData - Dados do formulário
     * @returns {number}
     */
    static countNOK(formData) {
        if (!formData?.items) return 0;
        return formData.items.filter(item => item.status === 'NOK').length;
    }

    /** @private */
    _buildResult() {
        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');
        const infos = this.issues.filter(i => i.severity === 'info');

        return {
            isValid: errors.length === 0,
            issueCount: this.issues.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            issues: [...this.issues],
            summary: {
                errors: errors.map(i => i.message),
                warnings: warnings.map(i => i.message),
                infos: infos.map(i => i.message)
            }
        };
    }

    /** Limpa issues */
    clear() {
        this.issues = [];
    }
}

// Singleton
const validationManager = new ValidationManager();

window.ValidationManager = ValidationManager;
window.validationManager = validationManager;