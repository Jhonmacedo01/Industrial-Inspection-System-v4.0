/**
 * INSPECTION FORM v3.0.0
 * Formulário GNSS (10 itens)
 * @module gnss-form
 */

class GNSSFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-gnss',
            formType: 'gnss',
            items: [
                {
                    number: 1,
                    title: 'Inspecionar estado de conservação do painel',
                    description: 'Verificar limpeza, conservação e iluminação'
                },
                {
                    number: 2,
                    title: 'Inspecionar a fechadura',
                    description: 'Verificar a vedação das entradas e saídas do cabeamento'
                },
                {
                    number: 3,
                    title: 'Inspecionar cabos e conexões',
                    description: 'Verificar se os cabos e conectores estão íntegros'
                },
                {
                    number: 4,
                    title: 'Inspecionar dispositivos',
                    description: 'Verificar a fixação do módulo'
                },
                {
                    number: 5,
                    title: 'Verificar LEDs e status dos dispositivos',
                    description: 'Caso o painel esteja alimentado'
                },
                {
                    number: 6,
                    title: 'Inspecionar tubos e conduítes',
                    description: 'Verificar os que vão do painel para a sala elétrica'
                },
                {
                    number: 7,
                    title: 'Inspecionar antenas à distância',
                    description: 'Verificar suporte, fixação, limpeza e conservação'
                },
                { number: 8, title: 'Registrar informações dos desvios na OM' },
                {
                    number: 9,
                    title: 'Abrir nota em caso de anormalidade',
                    measure: 'Registrar as anomalias no Solicitação de Manutenção'
                },
                {
                    number: 10,
                    title: 'Desmobilização e 5S',
                    measure: 'Verificar limpeza do local / Certificar que todos os resíduos foram descartados'
                }
            ]
        });
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="form-section">
                ${this.createSectionHeader('fa-satellite-dish', 'GNSS - Sistema de Navegação Global por Satélite')}
                ${this.createSummaryCards()}
                <div id="gnss-items-container"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('gnss-items-container');
        if (!itemsContainer) return;

        this.itemsConfig.forEach(item => {
            const card = this.createStandardCard(item);
            itemsContainer.appendChild(card);
            this.items.push({
                element: card,
                number: item.number,
                title: item.title,
                status: null,
                annotations: ''
            });
        });
    }
}

// Inicialização
let gnssForm = null;
document.addEventListener('DOMContentLoaded', () => {
    gnssForm = new GNSSFormManager();
    gnssForm.init();
    window.gnssForm = gnssForm;
});

window.GNSSFormManager = GNSSFormManager;