let tabuleiro = document.getElementById("tabuleiro");
const listaPalavras = document.getElementById("lista-palavras");
const contador = document.getElementById("contador");
const menu = document.getElementById("menu-palavras");
const botaoLista = document.getElementById("botao-lista");
const modalVitoria = document.getElementById("modal-vitoria");
const botaoReiniciar = document.getElementById("botao-reiniciar");

const alfabeto = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const TAMANHO = 25;          // tabuleiro 25 x 25 (625 letras)
const MAX_PALAVRAS = 10;     // no máximo 10 palavras sorteadas
const MAX_LETRAS = 25;       // no máximo 25 letras por palavra

// Banco de palavras em português do Brasil (sem acentos e sem caracteres especiais)
const bancoDePalavras = [
    "ABACAXI", "ELEFANTE", "COMPUTADOR", "BORBOLETA", "CACHOEIRA", "JABUTICABA",
    "GIRASSOL", "PARALELEPIPEDO", "BICICLETA", "CHOCOLATE", "MONTANHA", "TARTARUGA",
    "VIOLAO", "LARANJA", "MARACUJA", "BIBLIOTECA", "ESTRELA", "FOGUETE",
    "GUARDACHUVA", "PIRULITO", "CACHORRO", "SORVETE", "TROVAO", "FLORESTA",
    "AVENTURA", "PAPAGAIO", "CAPIVARA", "TUCANO", "BRIGADEIRO", "PAMONHA",
    "GOIABADA", "CAJU", "MANDIOCA", "FEIJOADA", "COXINHA", "PASTEL",
    "SAUDADE", "CARNAVAL", "BERIMBAU", "CAPOEIRA", "SERTAO", "PANTANAL",
    "AMAZONIA", "JANGADA", "JAGUATIRICA", "TAMANDUA", "ARARA", "SABIA",
    "ESTAGIARIO", "ESCRITORIO", "TECLADO", "MONITOR", "JANELA", "CADEIRA",
    "TELEFONE", "OTORRINOLARINGOLOGISTA", "MORANGO", "BANANA", "MELANCIA", "GALINHA"
];

const direcoes = [
    [0, 1], [1, 0], [1, 1], [-1, 1],
    [0, -1], [-1, 0], [-1, -1], [1, -1]
];

let palavrasSorteadas = [];
let palavrasEncontradas = new Set();
let celulas = [];

function aleatorio(max) {
    return Math.floor(Math.random() * max);
}

// Garante: só letras A-Z, sem acentos, sem especiais, até 25 letras
function normalizar(palavra) {
    return palavra
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
}

function sortear_palavras() {
    const validas = [...new Set(bancoDePalavras.map(normalizar))]
        .filter(p => p.length >= 3 && p.length <= MAX_LETRAS);

    for (let i = validas.length - 1; i > 0; i--) {
        const j = aleatorio(i + 1);
        [validas[i], validas[j]] = [validas[j], validas[i]];
    }
    return validas.slice(0, MAX_PALAVRAS);
}

function posicionar_palavra(palavra, grade) {
    for (let tentativa = 0; tentativa < 300; tentativa++) {
        const [dl, dc] = direcoes[aleatorio(direcoes.length)];
        const l0 = aleatorio(TAMANHO);
        const c0 = aleatorio(TAMANHO);
        const lf = l0 + dl * (palavra.length - 1);
        const cf = c0 + dc * (palavra.length - 1);

        if (lf < 0 || lf >= TAMANHO || cf < 0 || cf >= TAMANHO) continue;

        let cabe = true;
        for (let i = 0; i < palavra.length; i++) {
            const atual = grade[l0 + dl * i][c0 + dc * i];
            if (atual && atual !== palavra[i]) { cabe = false; break; }
        }
        if (!cabe) continue;

        for (let i = 0; i < palavra.length; i++) {
            grade[l0 + dl * i][c0 + dc * i] = palavra[i];
        }
        return true;
    }
    return false;
}

function gera_tabuleiro() {
    const grade = Array.from({ length: TAMANHO }, () => Array(TAMANHO).fill(null));

    // palavras maiores primeiro facilita o encaixe
    const sorteadas = sortear_palavras().sort((a, b) => b.length - a.length);
    palavrasSorteadas = sorteadas.filter(p => posicionar_palavra(p, grade));
    palavrasSorteadas.sort();

    tabuleiro.innerHTML = "";
    celulas = [];

    for (let l = 0; l < TAMANHO; l++) {
        for (let c = 0; c < TAMANHO; c++) {
            const letra = grade[l][c] || alfabeto[aleatorio(alfabeto.length)];
            const div = document.createElement("div");
            div.textContent = letra;
            tabuleiro.appendChild(div);
            celulas.push(div);
        }
    }

    // a limpeza do tabuleiro (innerHTML = "") também apagava a faixa da seleção
    tabuleiro.appendChild(faixaSelecao);
}

// ---------- Lista lateral ----------
function monta_lista() {
    listaPalavras.innerHTML = "";
    palavrasSorteadas.forEach(p => {
        const li = document.createElement("li");
        li.id = "palavra-" + p;
        li.textContent = p;
        listaPalavras.appendChild(li);
    });
    atualiza_contador();
}

function atualiza_contador() {
    contador.textContent = `${palavrasEncontradas.size} / ${palavrasSorteadas.length} encontradas`;
}

botaoLista.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botaoLista.setAttribute("aria-expanded", aberto);
    botaoLista.textContent = (aberto ? "✕" : "☰") + " Palavras";
});

// ---------- Seleção com o mouse (ou toque) ----------
let selecionando = false;
let indiceInicio = null;
let selecaoAtual = [];

function indice_da_celula(el) {
    return el && el.parentElement === tabuleiro ? celulas.indexOf(el) : -1;
}

// Retorna os índices em linha reta (horizontal, vertical ou diagonal) entre dois pontos
function linha_reta(indiceA, indiceB) {
    const l0 = Math.floor(indiceA / TAMANHO), c0 = indiceA % TAMANHO;
    const l1 = Math.floor(indiceB / TAMANHO), c1 = indiceB % TAMANHO;
    const dl = l1 - l0, dc = c1 - c0;

    if (dl !== 0 && dc !== 0 && Math.abs(dl) !== Math.abs(dc)) return null;

    const passos = Math.max(Math.abs(dl), Math.abs(dc));
    const sl = Math.sign(dl), sc = Math.sign(dc);
    const indices = [];
    for (let i = 0; i <= passos; i++) {
        indices.push((l0 + sl * i) * TAMANHO + (c0 + sc * i));
    }
    return indices;
}

// Cria a "faixa" de fundo que liga as letras
function cria_conexao() {
    const faixa = document.createElement("span");
    faixa.className = "conexao";
    tabuleiro.appendChild(faixa);
    return faixa;
}

// Estica e gira a faixa da primeira à última letra (qualquer das 8 direções)
function posiciona_conexao(faixa, indices) {
    const a = celulas[indices[0]];
    const b = celulas[indices[indices.length - 1]];
    const ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2;
    const bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
    const dx = bx - ax, dy = by - ay;
    const w = a.offsetWidth, h = a.offsetHeight;

    // mesma espessura em todas as direções (padrão da diagonal)
    const espessura = Math.min(w, h);
    const extra = espessura;

    const comprimento = Math.hypot(dx, dy) + extra;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;

    Object.assign(faixa.style, {
        display: "block",
        width: comprimento + "px",
        height: espessura + "px",
        left: (mx - comprimento / 2) + "px",
        top: (my - espessura / 2) + "px",
        transform: `rotate(${Math.atan2(dy, dx)}rad)`
    });
}

const faixaSelecao = cria_conexao();
const faixasEncontradas = []; // { indices, faixa }

function pinta_selecao(indices) {
    selecaoAtual.forEach(i => celulas[i].classList.remove("selecionada"));
    selecaoAtual = indices;
    selecaoAtual.forEach(i => celulas[i].classList.add("selecionada"));

    if (indices.length) {
        posiciona_conexao(faixaSelecao, indices);
    } else {
        faixaSelecao.style.display = "none";
    }
}

function finaliza_selecao() {
    if (!selecionando) return;
    selecionando = false;

    const texto = selecaoAtual.map(i => celulas[i].textContent).join("");
    const invertido = [...texto].reverse().join("");

    const achada = palavrasSorteadas.find(p =>
        !palavrasEncontradas.has(p) && (p === texto || p === invertido)
    );

    if (achada) {
        palavrasEncontradas.add(achada);
        selecaoAtual.forEach(i => celulas[i].classList.add("encontrada"));

        // palavra certa: faixa permanente, sem curvatura
        const faixa = cria_conexao();
        faixa.classList.add("completa");
        posiciona_conexao(faixa, selecaoAtual);
        faixasEncontradas.push({ indices: [...selecaoAtual], faixa });

        document.getElementById("palavra-" + achada).classList.add("encontrada");
        atualiza_contador();

        // todas as palavras encontradas: mostra o modal de vitória
        if (palavrasEncontradas.size === palavrasSorteadas.length) {
            modalVitoria.classList.add("aberto");
        }
    }

    pinta_selecao([]);
    indiceInicio = null;
}

// Se a janela mudar de tamanho, as faixas precisam acompanhar as letras
window.addEventListener("resize", () => {
    faixasEncontradas.forEach(f => posiciona_conexao(f.faixa, f.indices));
    if (selecaoAtual.length) posiciona_conexao(faixaSelecao, selecaoAtual);
});

tabuleiro.addEventListener("pointerdown", (e) => {
    const indice = indice_da_celula(e.target);
    if (indice < 0) return;
    e.preventDefault();
    selecionando = true;
    indiceInicio = indice;
    pinta_selecao([indice]);
});

tabuleiro.addEventListener("pointermove", (e) => {
    if (!selecionando) return;
    const alvo = document.elementFromPoint(e.clientX, e.clientY);
    const indice = indice_da_celula(alvo);
    if (indice < 0) return;

    const linha = linha_reta(indiceInicio, indice);
    if (linha) pinta_selecao(linha);
});

document.addEventListener("pointerup", finaliza_selecao);
document.addEventListener("pointercancel", finaliza_selecao);

// ---------- Reiniciar o jogo ----------
botaoReiniciar.addEventListener("click", () => location.reload());

// ---------- Início ----------
gera_tabuleiro();
monta_lista();