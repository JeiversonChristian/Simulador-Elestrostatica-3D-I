// IMPORTAÇÕES DAS BIBLIOTECAS
// Estamos trazendo o núcleo do Three.js e os controles de órbita (mouse/zoom)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================
// CONFIGURAÇÃO INICIAL DA CENA
// =============================

// Cria a cena
const cena = new THREE.Scene();
// Cor de fundo
cena.background = new THREE.Color(0x000000);

// Cria a câmera
// Parâmetros: Campo de visão, Proporção da tela, Distância mínima, Distância máxima
const camera = new THREE.PerspectiveCamera(120, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posição da câmera
camera.position.set(0, 0, 10);

// Cria o renderizador (o motor que desenha na tela)
// Antialias suaviza as bordas
const renderizador = new THREE.WebGLRenderer({ antialias: true }); 
// Define o tamanho igual à janela
renderizador.setSize(window.innerWidth, window.innerHeight); 
// Adiciona o elemento do renderizador (canvas) dentro da nossa div no HTML
document.getElementById('container-canvas').appendChild(renderizador.domElement);

// Adiciona os Controles de Órbita (para girar e dar zoom com o mouse/dedo)
const controles = new OrbitControls(camera, renderizador.domElement);
controles.enableDamping = true; // Adiciona uma inércia suave ao movimento
controles.dampingFactor = 0.1;

// ==========================================
// ILUMINAÇÃO
// ==========================================

// Luz Ambiente: Ilumina tudo por igual, sem sombras
// Cor branca, Intensidade 1.5
const luzAmbiente = new THREE.AmbientLight(0xffffff, 1.5); 
cena.add(luzAmbiente);

// ==========================================
// OBJETOS: A CARGA ELÉTRICA (UM PRÓTON)
// ==========================================

// Geometria: Formato de esfera
// SphereGeometry(Raio, SegmentosLargura, SegmentosAltura)
// rp ≈ 0,841 x 10^-15 m
const fator_escala_comprimento = 1e15;
const rp = (0.84e-15) * fator_escala_comprimento;
const geometriaCarga = new THREE.SphereGeometry(rp, 32, 32); 
// Material: Cor vermelha sólida, não afetada por sombras
const materialCarga = new THREE.MeshBasicMaterial({ color: 0xff0000 }); 
// Mesh: A junção da geometria com o material
const malhaCarga = new THREE.Mesh(geometriaCarga, materialCarga);
// Adiciona a carga no centro da cena (0,0,0)
malhaCarga.position.set(0, 0, 0);
cena.add(malhaCarga);

// ==========================================
// 4. LÓGICA DO CAMPO ELÉTRICO (A FÍSICA)
// ==========================================

// Grupo para guardar todas as setas (vetores) do campo.
// Isso facilita para esconder/mostrar todas de uma vez.
const grupoCampo = new THREE.Group();
cena.add(grupoCampo);

function criarCampoEletrico() {
    // ==========================================
    // 1. CONSTANTES FÍSICAS REAIS (SISTEMA INTERNACIONAL)
    // ==========================================
    
    const PI = Math.PI;
    // Permissividade Elétrica no Vácuo 
    // ε0 ≈ 8,854 x 10^-12 F/m 
    // (ou C^2/N . m^2)
    const permissividade = 8.854e-12;
    // const permissividade = 1.0;
    // Carga Elementar (Carga do Próton) (e)
    // e ≈ 1,602 x 10^-19 C
    const cargaEletrica = 1.602e-19;
    // const cargaEletrica = 150.0;
    
    // Configuração da "Grade" de vetores (onde vamos desenhar as setas)
    const espacamento = 2.5; // Distância entre cada seta
    const alcance = 2;       // Quantas setas para cada lado (ex: -2 até +2)

    // Loop Triplo: Percorre o espaço em X, Y e Z
    for (let x = -alcance; x <= alcance; x++) {
        for (let y = -alcance; y <= alcance; y++) {
            for (let z = -alcance; z <= alcance; z++) {
                
                // Calcula a posição real do ponto no espaço 3D
                const posX = x * espacamento;
                const posY = y * espacamento;
                const posZ = z * espacamento;

                // Cria um vetor com essa posição
                const vetorPosicao = new THREE.Vector3(posX, posY, posZ);
                
                // Calcula a distância 'r' do ponto até o centro (0,0,0)
                const distancia = (vetorPosicao.length());

                // IMPEDIR DIVISÃO POR ZERO:
                // Se a distância for muito pequena (dentro da carga), não desenhamos seta.
                if (distancia < 1.2) continue;

                // --- APLICAÇÃO DA FÓRMULA FÍSICA ---
                // Fórmula: E = (1 / 4πε) * (Q / r²)
                
                // 1. O termo da constante Eletrostática (k)
                const k = 1 / (4 * PI * permissividade);

                const fator_escala_campo = 5e9;
                // 2. O cálculo da magnitude (intensidade) do campo
                // Magnitude = k * (Q / r²)
                const magnitude = (k * (cargaEletrica / (distancia * distancia)) ) * fator_escala_campo;

                // --- VISUALIZAÇÃO ---
                
                // Direção: O campo de carga positiva aponta "para fora".
                // .normalize() transforma o vetor posição em um vetor de tamanho 1, mantendo a direção.
                const direcao = vetorPosicao.clone().normalize();

                // Configuração visual da seta
                const corSeta = 0xff0000; // Vermelho
                const tamanhoSeta = magnitude; // O comprimento da seta representa a intensidade
                const tamanhoCabeca = tamanhoSeta * 0.2; // Cabeça proporcional ao corpo
                const larguraCabeca = tamanhoCabeca * 0.5;

                // Cria a seta usando o auxiliar do Three.js (ArrowHelper)
                // Parâmetros: direção, origem, comprimento, cor, tamanho da cabeça, largura da cabeça
                const seta = new THREE.ArrowHelper(direcao, vetorPosicao, tamanhoSeta, corSeta, tamanhoCabeca, larguraCabeca);
                
                // Ajuste de Opacidade (Transparência)
                // Quanto mais longe, menor a magnitude, mais transparente fica.
                // Math.min(1, ...) garante que a opacidade nunca seja maior que 1 (totalmente visível)
                const opacidade = Math.min(1, magnitude / 1.5);

                // Precisamos aplicar a transparência nas duas partes da seta: a linha e o cone (cabeça)
                
                // Linha da seta
                seta.line.material = new THREE.MeshBasicMaterial({
                    color: corSeta,
                    transparent: true,
                    opacity: opacidade,
                    depthWrite: false // Ajuda na renderização de transparências sobrepostas
                });

                // Cone da seta
                seta.cone.material = new THREE.MeshBasicMaterial({
                    color: corSeta,
                    transparent: true,
                    opacity: opacidade,
                    depthWrite: false
                });

                // Adiciona a seta pronta ao grupo
                grupoCampo.add(seta);
            }
        }
    }
}

// Executa a função para criar o campo
criarCampoEletrico();

// ==========================================
// 5. INTERATIVIDADE (O BOTÃO)
// ==========================================

const botao = document.getElementById('botao-alternar');
let campoVisivel = true; // Variável de estado (controla se está visível ou não)

botao.addEventListener('click', () => {
    // Inverte o estado (se era true vira false, se era false vira true)
    campoVisivel = !campoVisivel;
    
    // Aplica a visibilidade ao grupo de setas
    grupoCampo.visible = campoVisivel;

    // Atualiza o texto e a cor do botão para feedback visual
    if (campoVisivel) {
        botao.textContent = "Ocultar Campo Elétrico";
        botao.style.backgroundColor = "#ff3333"; // Vermelho
    } else {
        botao.textContent = "Mostrar Campo Elétrico";
        botao.style.backgroundColor = "#555"; // Cinza
    }
});

// Evento para redimensionar a tela (Responsividade)
// Se o usuário mudar o tamanho da janela, ajustamos a câmera e o renderizador
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 6. LOOP DE ANIMAÇÃO (O MOTOR DO JOGO)
// ==========================================

function animar() {
    // Pede ao navegador para chamar essa função de novo no próximo quadro (aprox. 60 vezes por segundo)
    requestAnimationFrame(animar);

    // Atualiza os controles (necessário para o efeito de inércia/amortecimento)
    controles.update();

    // Desenha a cena na tela usando a câmera
    renderizador.render(cena, camera);
}

// Inicia o loop
animar();