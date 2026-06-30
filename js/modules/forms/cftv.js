/**
 * INSPECTION FORM v3.0.0
 * Formulário CFTV (9 itens)
 * @module cftv-form
 */

class CFTVFormManager extends BaseFormManager {
    constructor() {
        super({
            containerId: 'panel-cftv',
            formType: 'cftv',
            items: [
                { number: 1, title: 'Inspecionar estado de conservação do painel' },
                { number: 2, title: 'Verificar limpeza, conservação e fechadura' },
                { number: 3, title: 'Vedação das entradas e saídas do cabeamento' },
                {
                    number: 4,
                    title: 'Verificar se cabos e conectores estão íntegros',
                    description: 'Sem avarias, nem oxidação'
                },
                {
                    number: 5,
                    title: 'Verificar LEDs de status dos dispositivos',
                    description: 'Caso o painel esteja alimentado'
                },
                {
                    number: 6,
                    title: 'Verificar tubos e conduítes',
                    description: 'Que vão do painel para a sala elétrica'
                },
                {
                    number: 7,
                    title: 'Verificar suporte, fixação, limpeza das câmeras',
                    description: 'À distância'
                },
                {
                    number: 8,
                    title: 'Abrir nota em caso de anormalidade',
                    measure: 'Registrar as anomalias no Solicitação de Manutenção'
                },
                {
                    number: 9,
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
                ${this.createSectionHeader('fa-video', 'CFTV - Circuito Fechado de Televisão')}
                ${this.createSummaryCards()}
                <div id="cftv-items-container"></div>
            </div>
        `;

        const itemsContainer = document.getElementById('cftv-items-container');
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
let cftvForm = null;
document.addEventListener('DOMContentLoaded', () => {
    cftvForm = new CFTVFormManager();
    cftvForm.init();
    window.cftvForm = cftvForm;
});

window.CFTVFormManager = CFTVFormManager;