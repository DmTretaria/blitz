/*
  Este script controla a lógica para as páginas index.html e relatorio.html
  do projeto BLITZ 45 Dias.
*/

// --- Constantes Globais ---
const DIAS_CRITERIO = 45;
const CHAVE_STORAGE = 'blitzProdutos'; // Chave do Local Storage

// --- Funções Auxiliares ---

/**
 * Pega os dados brutos do Local Storage e os transforma em um array.
 * @returns {Array} Um array de objetos de produto.
 */
function getProdutosSalvos() {
    const dados = localStorage.getItem(CHAVE_STORAGE);
    return dados ? JSON.parse(dados) : [];
}

/**
 * Salva o array de produtos de volta no Local Storage.
 * @param {Array} produtos - O array de produtos para salvar.
 */
function salvarProdutos(produtos) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(produtos));
}

/**
 * Calcula a diferença em dias entre a data de vencimento e hoje.
 * @param {string} dataVencimento - A data no formato YYYY-MM-DD.
 * @returns {number} O número de dias restantes.
 */
function calcularDiasRestantes(dataVencimento) {
    // Corrige o fuso horário pegando a data como 'T12:00:00' (meio-dia)
    const venc = new Date(dataVencimento + 'T12:00:00');
    const hoje = new Date();
    
    // Zera as horas para comparar apenas as datas
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = venc.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Mostra uma notificação temporária na tela.
 * @param {string} mensagem - A mensagem a ser exibida.
 * @param {string} tipo - 'sucesso' ou 'erro'.
 */
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const divNotificacao = document.getElementById('notificacao');
    if (!divNotificacao) return;

    divNotificacao.textContent = mensagem;
    divNotificacao.className = tipo; // Remove 'hidden' e aplica o tipo
    
    setTimeout(() => {
        divNotificacao.className = 'hidden';
    }, 3000); // Esconde após 3 segundos
}

// --- Lógica da Página de Registro (index.html) ---

function handleRegistroSubmit(event) {
    event.preventDefault(); // Impede o envio real do formulário
    
    // Captura dos valores do formulário
    const nome = document.getElementById('produtoNome').value;
    const codigo = document.getElementById('produtoCodigo').value;
    const lote = document.getElementById('produtoLote').value;
    const vencimento = document.getElementById('produtoVencimento').value;

    const diasRestantes = calcularDiasRestantes(vencimento);

    // Função de salvamento
    const salvar = () => {
        const produtos = getProdutosSalvos();
        const dataRegistro = new Date().toISOString(); // Salva quando foi registrado

        produtos.push({
            nome,
            codigo,
            lote,
            vencimento,
            diasRestantes,
            dataRegistro
        });
        
        salvarProdutos(produtos);
        mostrarNotificacao('Produto registrado com sucesso!', 'sucesso');
        document.getElementById('formBlitz').reset(); // Limpa o formulário
        document.getElementById('produtoNome').focus(); // Foca no primeiro campo
    };

    // Validação dos 45 dias
    if (diasRestantes <= DIAS_CRITERIO) {
        // Dentro do critério, salva direto
        salvar();
    } else {
        // Fora do critério, pede confirmação
        const confirmar = confirm(
            `ATENÇÃO: Este produto vence em ${diasRestantes} dias (fora do critério de ${DIAS_CRITERIO} dias).\\n\\n` +
            `Deseja registrar mesmo assim?`
        );
        if (confirmar) {
            salvar();
        } else {
            mostrarNotificacao('Registro cancelado pelo usuário.', 'erro');
        }
    }
}

// --- Lógica da Página de Relatório (relatorio.html) ---

/**
 * Carrega os dados do Local Storage e preenche a tabela.
 */
function carregarTabelaRelatorio() {
    const tabelaBody = document.getElementById('tabelaDados');
    if (!tabelaBody) return; // Sai se não estiver na página do relatório

    const produtos = getProdutosSalvos();
    tabelaBody.innerHTML = ''; // Limpa a tabela

    if (produtos.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum produto registrado ainda.</td></tr>';
        return;
    }

    // Ordena por dias restantes (mais urgente primeiro)
    produtos.sort((a, b) => a.diasRestantes - b.diasRestantes);

    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        
        // Adiciona classe de perigo se estiver vencendo
        if (produto.diasRestantes <= 7) {
            tr.classList.add('vencendo-7d');
        } else if (produto.diasRestantes <= DIAS_CRITERIO) {
            tr.classList.add('vencendo-45d');
        }

        // Formata data de vencimento para DD/MM/YYYY
        const dataVenc = new Date(produto.vencimento + 'T12:00:00');
        const vencFormatado = dataVenc.toLocaleDateString('pt-BR');

        // Formata data de registro
        const dataReg = new Date(produto.dataRegistro);
        const regFormatado = dataReg.toLocaleString('pt-BR');

        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.codigo}</td>
            <td>${produto.lote}</td>
            <td>${vencFormatado}</td>
            <td>${produto.diasRestantes}</td>
            <td>${regFormatado}</td>
        `;
        tabelaBody.appendChild(tr);
    });
}

/**
 * Exporta os dados da tabela para um arquivo CSV.
 */
function exportarParaCSV() {
    const produtos = getProdutosSalvos();
    if (produtos.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    // Define os cabeçalhos (use ponto e vírgula para compatibilidade com Excel BR)
    const headers = 'Produto;Codigo_Barras;Lote;Data_Vencimento;Dias_Restantes;Data_Registro\\n';
    
    // Mapeia os dados para o formato CSV
    const rows = produtos.map(p => {
        const dataVenc = new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR');
        const dataReg = new Date(p.dataRegistro).toLocaleString('pt-BR');
        // Limpa os dados para evitar quebras no CSV (ex: ponto e vírgula no nome)
        const nomeLimpo = p.nome.replace(/;/g, ','); 
        
        return `${nomeLimpo};${p.codigo};${p.lote};${dataVenc};${p.diasRestantes};${dataReg}`;
    }).join('\\n');

    const csvContent = headers + rows;

    // Cria o link de download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const dataHoje = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `RELATORIO_BLITZ_${dataHoje}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Limpa todos os dados salvos no Local Storage.
 */
function limparTodosOsDados() {
    const confirmar = confirm(
        'ATENÇÃO!\\n\\nIsso apagará TODOS os registros de produtos salvos no navegador.' +
        '\\nUse isso apenas após gerar o relatório e ter certeza que não precisa mais dos dados.' +
        '\\n\\nDeseja continuar?'
    );

    if (confirmar) {
        localStorage.removeItem(CHAVE_STORAGE);
        alert('Dados limpos com sucesso.');
        carregarTabelaRelatorio(); // Recarrega a tabela (agora vazia)
    }
}


// --- Inicialização ---

// Aguarda o DOM (a página) carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    
    // Seletor de Rota: Decide o que fazer baseado na página atual

    // Se encontrar o formulário, estamos na index.html
    const form = document.getElementById('formBlitz');
    if (form) {
        form.addEventListener('submit', handleRegistroSubmit);
        document.getElementById('produtoNome').focus(); // Foca no primeiro campo ao carregar
    }

    // Se encontrar a tabela, estamos na relatorio.html
    const tabela = document.getElementById('tabelaRelatorio');
    if (tabela) {
        carregarTabelaRelatorio();
        document.getElementById('exportarCSV').addEventListener('click', exportarParaCSV);
        document.getElementById('limparDados').addEventListener('click', limparTodosOsDados);
    }
});
