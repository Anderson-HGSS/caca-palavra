let tabuleiro = document.getElementById("tabuleiro");
const listaPalavras = document.getElementById("lista-palavras");
const contador = document.getElementById("contador");
const menu = document.getElementById("menu-palavras");
const botaoLista = document.getElementById("botao-lista");
const modalVitoria = document.getElementById("modal-vitoria");
const botaoReiniciar = document.getElementById("botao-reiniciar");
const modalPalavras = document.getElementById("modal-palavras");
const listaPalavrasModal = document.getElementById("lista-palavras-modal");
const contadorModal = document.getElementById("contador-modal");
const rotuloBotao = botaoLista.querySelector(".rotulo");
const telaMobile = window.matchMedia("(max-width: 768px)");

const alfabeto = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

// Configuração dinâmica das dimensões:
// Desktop: 25 colunas x 25 linhas
// Mobile: 15 colunas x 27 linhas
const COLUNAS = telaMobile.matches ? 15 : 25;
const LINHAS = telaMobile.matches ? 26 : 25;
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
    for (let tentativa = 0; tentativa < 1000; tentativa++) {
        const [dl, dc] = direcoes[aleatorio(direcoes.length)];
        const l0 = aleatorio(LINHAS);
        const c0 = aleatorio(COLUNAS);
        const lf = l0 + dl * (palavra.length - 1);
        const cf = c0 + dc * (palavra.length - 1);

        if (lf < 0 || lf >= LINHAS || cf < 0 || cf >= COLUNAS) continue;

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
    const grade = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill(null));

    // palavras maiores primeiro facilita o encaixe
    const sorteadas = sortear_palavras().sort((a, b) => b.length - a.length);
    palavrasSorteadas = sorteadas.filter(p => posicionar_palavra(p, grade));
    palavrasSorteadas.sort();

    tabuleiro.innerHTML = "";
    celulas = [];

    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            const letra = grade[l][c] || alfabeto[aleatorio(alfabeto.length)];
            const div = document.createElement("div");
            div.textContent = letra;
            tabuleiro.appendChild(div);
            celulas.push(div);
        }
    }

    tabuleiro.appendChild(faixaSelecao);
}

// ---------- Lista lateral ----------
function monta_lista() {
    [listaPalavras, listaPalavrasModal].forEach(lista => {
        lista.innerHTML = "";
        palavrasSorteadas.forEach(p => {
            const li = document.createElement("li");
            li.dataset.palavra = p;
            li.textContent = p;
            lista.appendChild(li);
        });
    });
    atualiza_contador();
}

function atualiza_contador() {
    const texto = `${palavrasEncontradas.size} / ${palavrasSorteadas.length} encontradas`;
    contador.textContent = texto;
    contadorModal.textContent = texto;
}

botaoLista.addEventListener("click", () => {
    if (telaMobile.matches) {
        modalPalavras.classList.add("aberto");
        return;
    }
    const aberto = menu.classList.toggle("aberto");
    botaoLista.setAttribute("aria-expanded", aberto);
    rotuloBotao.textContent = (aberto ? "✕" : "☰") + " Palavras";
});

modalPalavras.addEventListener("click", () => modalPalavras.classList.remove("aberto"));

// ---------- Seleção com o mouse (ou toque) ----------
let selecionando = false;
let indiceInicio = null;
let selecaoAtual = [];

function indice_da_celula(el) {
    return el && el.parentElement === tabuleiro ? celulas.indexOf(el) : -1;
}

function linha_reta(indiceA, indiceB) {
    const l0 = Math.floor(indiceA / COLUNAS), c0 = indiceA % COLUNAS;
    const l1 = Math.floor(indiceB / COLUNAS), c1 = indiceB % COLUNAS;
    const dl = l1 - l0, dc = c1 - c0;

    if (dl !== 0 && dc !== 0 && Math.abs(dl) !== Math.abs(dc)) return null;

    const passos = Math.max(Math.abs(dl), Math.abs(dc));
    const sl = Math.sign(dl), sc = Math.sign(dc);
    const indices = [];
    for (let i = 0; i <= passos; i++) {
        indices.push((l0 + sl * i) * COLUNAS + (c0 + sc * i));
    }
    return indices;
}

function cria_conexao() {
    const faixa = document.createElement("span");
    faixa.className = "conexao";
    tabuleiro.appendChild(faixa);
    return faixa;
}

function posiciona_conexao(faixa, indices) {
    const a = celulas[indices[0]];
    const b = celulas[indices[indices.length - 1]];
    const ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2;
    const bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
    const dx = bx - ax, dy = by - ay;
    const w = a.offsetWidth, h = a.offsetHeight;

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
const faixasEncontradas = [];

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

        const faixa = cria_conexao();
        faixa.classList.add("completa");
        posiciona_conexao(faixa, selecaoAtual);
        faixasEncontradas.push({ indices: [...selecaoAtual], faixa });

        document.querySelectorAll(`[data-palavra="${achada}"]`)
            .forEach(li => li.classList.add("encontrada"));
        atualiza_contador();

        if (palavrasEncontradas.size === palavrasSorteadas.length) {
            modalVitoria.classList.add("aberto");
        }
    }

    pinta_selecao([]);
    indiceInicio = null;
}

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

function processarMovimento(clientX, clientY) {
    if (!selecionando) return;
    const alvo = document.elementFromPoint(clientX, clientY);
    const indice = indice_da_celula(alvo);
    if (indice < 0) return;

    const linha = linha_reta(indiceInicio, indice);
    if (linha) pinta_selecao(linha);
}

tabuleiro.addEventListener("pointermove", (e) => {
    processarMovimento(e.clientX, e.clientY);
});

tabuleiro.addEventListener("touchmove", (e) => {
    if (!selecionando) return;
    const touch = e.touches[0];
    processarMovimento(touch.clientX, touch.clientY);
}, { passive: true });

document.addEventListener("pointerup", finaliza_selecao);
document.addEventListener("pointercancel", finaliza_selecao);
document.addEventListener("touchend", finaliza_selecao);

// Recarrega se a tela alternar entre mobile e desktop
telaMobile.addEventListener("change", () => location.reload());

botaoReiniciar.addEventListener("click", () => location.reload());

gera_tabuleiro();
monta_lista();