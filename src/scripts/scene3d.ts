import {
  Box3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import symbolSvg from '../assets/logo/volt-symbol.svg?raw';

const FOV = 30;
const CAMERA_Z = 10;
const LIME = new Color('#c6f000');
const PAPER = new Color('#f4f3ef');
// Em telas de toque a cena abre mão do reflexo e do verniz, que são o que mais pesa na GPU do celular.
const LIGHT = matchMedia('(pointer: coarse)').matches;
// Sem reflexo do ambiente, a peça apagada precisa de um tom próprio para não sumir no preto.
const DIM = new Color(LIGHT ? '#2d2e33' : '#141518');
const { smoothstep, lerp, clamp } = MathUtils;

// Devolve o controle ao navegador entre as etapas pesadas, para a rolagem não travar.
const breathe = () => new Promise((resolve) => setTimeout(resolve));

// Na ordem do SVG: bloco superior, bloco inferior, traço principal.
const BASE_COLOR = [PAPER, PAPER, LIME];
const SCATTER = [
  { move: new Vector3(-74, 66, 60), spin: new Vector3(0.5, -0.65, 0.28) },
  { move: new Vector3(74, -66, 60), spin: new Vector3(-0.45, 0.6, -0.3) },
  { move: new Vector3(0, 0, -34), spin: new Vector3(0.08, 0.12, -0.08) },
];

// O que o objeto mostra em cada serviço: uma peça acesa, a estrutura em linhas ou o conjunto.
const SERVICE_SCENES = [
  { highlight: 2, wire: false, scatter: 1 },
  { highlight: 0, wire: false, scatter: 1 },
  { highlight: -1, wire: true, scatter: 0 },
  { highlight: -1, wire: false, scatter: 0 },
  { highlight: -1, wire: false, scatter: 0.55 },
];

type Track = 'hero' | 'services' | 'process' | 'closing';

type Pose = {
  x: number; // centro da peça, em fração do palco
  y: number;
  size: number; // largura, em unidades do mundo
  z: number;
  rotX: number;
  rotY: number;
  scatter: number;
  highlight: number; // peça acesa em lime; -1 usa as cores da marca
  wire: boolean;
  flash: number; // quanto o lime ocupa a tela, de 0 a 1
};

function buildSymbol() {
  const pivot = new Group();
  const { paths } = new SVGLoader().parse(symbolSvg.replace('currentColor', '#000'));
  const box = new Box3();
  const pieces: { mesh: Mesh; material: MeshStandardMaterial; home: Vector3 }[] = [];

  paths.forEach((path, index) => {
    const color = BASE_COLOR[index].clone();
    const material = LIGHT
      ? new MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.5 })
      : new MeshPhysicalMaterial({
          color,
          metalness: 0.05,
          roughness: 0.38,
          clearcoat: 0.3,
          clearcoatRoughness: 0.22,
        });
    // Peça mais fina, com chanfro suave: lê como um objeto desenhado, não como um bloco extrudado.
    const geometry = new ExtrudeGeometry(path.toShapes(true), {
      depth: 18,
      bevelEnabled: true,
      bevelSize: 2.2,
      bevelThickness: 2.6,
      bevelSegments: LIGHT ? 2 : 6,
      curveSegments: LIGHT ? 12 : 32,
    });
    // O SVG tem o eixo Y para baixo. Girar (em vez de espelhar) mantém as normais corretas.
    geometry.rotateX(Math.PI);
    const mesh = new Mesh(geometry, material);
    pivot.add(mesh);
    box.expandByObject(mesh);
    pieces.push({ mesh, material, home: new Vector3() });
  });

  const center = box.getCenter(new Vector3());
  // Cada peça gira em torno do próprio centro, senão ela orbita em vez de girar.
  for (const piece of pieces) {
    piece.mesh.geometry.computeBoundingBox();
    const own = piece.mesh.geometry.boundingBox!.getCenter(new Vector3());
    piece.mesh.geometry.translate(-own.x, -own.y, -own.z);
    piece.home.copy(own).sub(center);
  }

  return { pivot, pieces, width: box.getSize(new Vector3()).x };
}

export async function startScene3d(canvas: HTMLCanvasElement) {
  const names: Track[] = ['hero', 'services', 'process', 'closing'];
  const sections = Object.fromEntries(
    names.map((name) => [name, document.querySelector<HTMLElement>(`[data-track="${name}"]`)!]),
  ) as Record<Track, HTMLElement>;
  const stages = Object.fromEntries(
    names.map((name) => [name, sections[name].querySelector<HTMLElement>('[data-stage]')!]),
  ) as Record<Track, HTMLElement>;

  const header = document.querySelector<HTMLElement>('header')!;
  const hint = sections.hero.querySelector<HTMLElement>('[data-hint]')!;
  const heroFirst = sections.hero.querySelector<HTMLElement>('[data-first]')!;
  const heroSecond = sections.hero.querySelector<HTMLElement>('[data-second]')!;
  const heroFlash = sections.hero.querySelector<HTMLElement>('[data-flash]')!;
  const servicesRail = sections.services.querySelector<HTMLElement>('[data-rail-track]')!;
  const serviceCount = servicesRail.children.length;
  const stepItems = [...sections.process.querySelectorAll<HTMLElement>('[data-item]')];
  const closingContent = sections.closing.querySelector<HTMLElement>('[data-closing]')!;
  const flashes = {
    closing: sections.closing.querySelector<HTMLElement>('[data-flash]')!,
  };

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // Aparelhos com pouca memória ou poucos núcleos renderizam em resolução menor.
  const modest = (navigator.hardwareConcurrency ?? 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, modest ? 1.25 : LIGHT ? 1.5 : 1.75));
  // Sem tone mapping: a face frontal precisa chegar perto do lime da marca (#C6F000).
  renderer.toneMapping = NoToneMapping;

  const scene = new Scene();
  if (LIGHT) {
    // Faz o papel do reflexo do ambiente, sem o custo de gerar o mapa na abertura.
    scene.add(new HemisphereLight('#ffffff', '#8a8a8a', 2.1));
  } else {
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();
    scene.environmentIntensity = 0.42;
  }
  await breathe();

  const key = new DirectionalLight('#ffffff', 2.5);
  // Luz oblíqua: de frente, o reflexo lavaria o lime de branco quando a câmera se aproxima.
  key.position.set(-5, 6, 6);
  const rim = new DirectionalLight('#ffffff', 0.5);
  rim.position.set(5, -2, -3);
  scene.add(key, rim);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.z = CAMERA_Z;

  const { pivot, pieces, width: symbolWidth } = buildSymbol();
  scene.add(pivot);

  let viewW = 1;
  let viewH = 1;
  let narrow = false;
  let rendered = NaN;
  // No celular, a peça ocupa o espaço real entre a barra e o texto do palco.
  const fit = { process: { y: 0.25, heightPx: 200 } };

  const measure = () => {
    const barBottom = header.getBoundingClientRect().bottom;
    for (const name of ['process'] as const) {
      const stage = stages[name];
      const top = stage.querySelector<HTMLElement>('[data-column]')!.offsetTop;
      const heightPx = Math.max(top - barBottom, 80);
      fit[name] = { y: (barBottom + heightPx / 2) / stage.offsetHeight, heightPx };
    }
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Mudar o tamanho apaga o canvas: o próximo quadro precisa desenhar de novo.
    rendered = NaN;
    viewH = 2 * Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z;
    viewW = viewH * camera.aspect;
    narrow = w < 900;
    measure();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  document.fonts?.ready.then(measure);

  // Largura da peça para caber na altura disponível; `spread` reserva espaço para as peças soltas.
  const narrowSize = (name: 'process', spread: number) => {
    const heightWorld = (fit[name].heightPx / canvas.clientHeight) * viewH;
    return Math.min(viewW * 0.8, (heightWorld * 0.86 * (297 / 215)) / spread);
  };

  const progressOf = (name: Track) => {
    const rect = sections[name].getBoundingClientRect();
    const range = rect.height - stages[name].offsetHeight;
    return range > 0 ? clamp(-rect.top / range, 0, 1) : 0;
  };

  // Só escreve no estilo quando o valor muda: cada escrita à toa custa uma repintura.
  const written = new WeakMap<HTMLElement, Map<string, string>>();
  const put = (element: HTMLElement, property: string, value: string) => {
    let values = written.get(element);
    if (!values) written.set(element, (values = new Map()));
    if (values.get(property) === value) return;
    values.set(property, value);
    element.style.setProperty(property, value);
  };
  const num = (value: number) => value.toFixed(3);

  const setBlock = (element: HTMLElement, opacity: number, shift: number) => {
    put(element, 'opacity', num(opacity));
    put(element, 'transform', `translateY(${num(shift)}px)`);
    put(element, 'visibility', opacity < 0.02 ? 'hidden' : 'visible');
  };

  const setActive = (items: HTMLElement[], index: number) => {
    items.forEach((item, i) => item.classList.toggle('is-active', i === index));
  };

  const poses: Record<Track, (p: number) => Pose> = {
    hero(p) {
      put(hint, 'opacity', num(1 - smoothstep(p, 0.02, 0.1)));
      header.classList.toggle('is-intro', p < 0.66);
      // A câmera aproxima do traço verde até o lime tomar a tela.
      const zoom = smoothstep(p, 0.08, 0.58);
      const fill = smoothstep(p, 0.53, 0.6);
      // O lime abre pela diagonal da marca e revela as frases sobre o preto.
      const open = smoothstep(p, 0.6, 0.74);
      const edge = open * 170;
      put(heroFlash, 'opacity', num(fill));
      put(heroFlash, 'clip-path', `polygon(${num(edge)}% 0, 170% 0, 100% 100%, ${num(edge - 70)}% 100%)`);
      const title = smoothstep(p, 0.68, 0.8);
      const rest = smoothstep(p, 0.78, 0.9);
      setBlock(heroFirst, title, 36 * (1 - title));
      setBlock(heroSecond, rest, 24 * (1 - rest));
      return {
        x: 0.5,
        y: 0.5,
        size: narrow ? Math.min(viewW * 0.8, viewH * 0.38) : Math.min(viewW * 0.3, viewH * 0.48),
        z: zoom * zoom * (CAMERA_Z - 0.75),
        rotX: 0.14 * (1 - zoom),
        rotY: -0.42 * (1 - zoom),
        scatter: 0,
        highlight: -1,
        wire: false,
        flash: fill,
      };
    },
    services(p) {
      // Cada serviço segura a tela por um tempo antes de deslizar para o próximo.
      const steps = Math.min(p / 0.88, 1) * (serviceCount - 1);
      const whole = Math.min(Math.floor(steps), serviceCount - 2);
      const value = whole + smoothstep(steps - whole, 0.6, 1);
      put(servicesRail, 'transform', `translate3d(${num((-value * 100) / serviceCount)}%, 0, 0)`);
      const scenePick = SERVICE_SCENES[Math.round(value)];
      // No fim da faixa as peças voam em direção à câmera e abrem caminho para os projetos.
      const leave = smoothstep(p, 0.93, 1);
      // O texto sai antes de as peças crescerem, para os dois nunca se sobreporem.
      put(servicesRail, 'opacity', num(1 - smoothstep(p, 0.9, 0.94)));
      return {
        x: 0.5,
        y: narrow ? 0.49 : 0.57,
        size: narrow ? Math.min(viewW * 0.8, viewH * 0.38) : Math.min(viewW * 0.3, viewH * 0.42),
        z: leave * (CAMERA_Z - 3),
        rotX: 0.16,
        rotY: -0.1 + Math.sin(steps * 1.57) * 0.34,
        scatter: scenePick.scatter + leave * 2.4,
        highlight: scenePick.highlight,
        wire: scenePick.wire,
        flash: 0,
      };
    },
    process(p) {
      setActive(stepItems, Math.min(stepItems.length - 1, Math.floor(p * stepItems.length)));
      const eased = smoothstep(p, 0.04, 0.82);
      return {
        x: 0.5,
        y: fit.process.y,
        // O tamanho sai do espaço acima do texto, em qualquer tela: as peças soltas nunca chegam ao título.
        size: Math.min(narrowSize('process', 1.75), viewW * 0.3),
        z: 0,
        rotX: lerp(0.32, 0.1, eased),
        rotY: lerp(-0.62, -0.2, eased),
        scatter: lerp(0.8, 0, eased),
        highlight: -1,
        wire: false,
        flash: 0,
      };
    },
    closing(p) {
      const zoom = smoothstep(p, 0.2, 0.68);
      const reveal = smoothstep(p, 0.62, 0.82);
      setBlock(closingContent, reveal, 28 * (1 - reveal));
      return {
        x: 0.5,
        y: 0.5,
        size: narrow ? viewW * 0.7 : Math.min(viewW * 0.36, viewH * 0.56),
        z: zoom * zoom * (CAMERA_Z - 1.3),
        rotX: 0.16 * (1 - zoom),
        rotY: -0.45 * (1 - zoom),
        scatter: 0,
        highlight: -1,
        wire: false,
        flash: smoothstep(p, 0.5, 0.64),
      };
    },
  };

  let pointerX = 0;
  let pointerY = 0;
  if (!LIGHT) {
    window.addEventListener(
      'pointermove',
      (event) => {
        pointerX = event.clientX / window.innerWidth - 0.5;
        pointerY = event.clientY / window.innerHeight - 0.5;
      },
      { passive: true },
    );
  }

  const damped = Object.fromEntries(names.map((name) => [name, progressOf(name)])) as Record<Track, number>;
  let current: Track | null = null;
  let last = performance.now();
  let rotX = 0;
  let rotY = 0;
  let scatter = 0;
  let cleared = false;
  let frame = 0;
  const tint = new Color();

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = now - last;
    last = now;
    // No toque a cena responde mais devagar: uma deslizada forte vira um movimento, não um salto.
    const damp = 1 - Math.exp(-dt / (LIGHT ? 240 : 110));

    // O objeto pertence ao palco mais próximo de estar fixado. O espaço entre os palcos é
    // maior que a tela, então a troca sempre acontece com ele fora de vista.
    let next: Track | null = null;
    let nearest = Infinity;
    for (const name of names) {
      const rect = stages[name].getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= canvas.clientHeight) continue;
      const distance = Math.abs(rect.top);
      if (distance < nearest) {
        nearest = distance;
        next = name;
      }
    }

    if (next !== 'hero') header.classList.remove('is-intro');

    if (!next) {
      header.classList.remove('is-flash');
      if (!cleared) {
        renderer.clear();
        cleared = true;
      }
      return;
    }
    cleared = false;

    const entering = next !== current;
    current = next;
    const raw = progressOf(next);
    damped[next] = entering ? raw : damped[next] + (raw - damped[next]) * damp;
    const pose = poses[next](damped[next]);

    const stage = stages[next].getBoundingClientRect();

    const calm = clamp(1 - pose.z / (CAMERA_Z - 1.3), 0, 1);
    // O balanço contínuo obrigaria a redesenhar a cena mesmo com a tela parada.
    const sway = LIGHT ? 0 : Math.sin(now / 2400) * 0.08 * calm;
    const bob = LIGHT ? 0 : Math.cos(now / 3100) * 0.03;
    const follow = entering ? 1 : damp;
    rotY += (pose.rotY + sway + pointerX * 0.4 * calm - rotY) * follow;
    rotX += (pose.rotX + (pointerY * 0.28 + bob) * calm - rotX) * follow;
    scatter += (pose.scatter - scatter) * follow;

    // A posição acompanha o palco sem suavização, para a peça rolar junto com a página.
    const depth = (CAMERA_Z - pose.z) / CAMERA_Z;
    pivot.position.x = ((stage.left + pose.x * stage.width) / canvas.clientWidth - 0.5) * viewW * depth;
    pivot.position.y = -((stage.top + pose.y * stage.height) / canvas.clientHeight - 0.5) * viewH * depth;
    pivot.position.z = pose.z;
    pivot.rotation.set(rotX, rotY, -0.04 * calm);
    pivot.scale.setScalar(pose.size / symbolWidth);

    pieces.forEach((piece, index) => {
      const { move, spin } = SCATTER[index];
      piece.mesh.position.copy(piece.home).addScaledVector(move, scatter);
      piece.mesh.rotation.set(spin.x * scatter, spin.y * scatter, spin.z * scatter);
      const lit = pose.highlight < 0 || pose.highlight === index;
      if (pose.highlight === index) tint.copy(LIME);
      else tint.copy(lit ? BASE_COLOR[index] : DIM);
      if (pose.wire) tint.copy(LIME);
      const mix = entering ? 1 : 1 - Math.exp(-dt / 160);
      piece.material.color.lerp(tint, mix);
      piece.material.wireframe = pose.wire;
      // Apagada, a peça vira preto brilhante e reflete o ambiente em vez de sumir no fundo.
      if (piece.material instanceof MeshPhysicalMaterial) {
        piece.material.roughness = lerp(piece.material.roughness, lit ? 0.38 : 0.16, mix);
        piece.material.clearcoat = lerp(piece.material.clearcoat, lit ? 0.3 : 1, mix);
        piece.material.envMapIntensity = lerp(piece.material.envMapIntensity, lit ? 1 : 3.2, mix);
      }
    });

    if (next === 'closing') {
      put(flashes[next], 'opacity', num(pose.flash));
      header.classList.toggle('is-flash', pose.flash > 0.5 && stage.top <= 34 && stage.bottom > 34);
    } else {
      header.classList.remove('is-flash');
    }

    put(canvas, 'visibility', pose.flash >= 1 ? 'hidden' : 'visible');

    // Em telas de toque, nada de redesenhar um quadro igual ao anterior.
    if (LIGHT) {
      const { x, y, z } = pivot.position;
      const { r, g } = pieces[0].material.color;
      const { r: r2, g: g2 } = pieces[2].material.color;
      const state =
        x + y * 3 + z * 5 + rotX * 7 + rotY * 11 + pivot.scale.x * 13 + scatter * 17 + r + g * 2 + r2 * 3 + g2 * 4 + (pose.wire ? 19 : 0);
      if (!entering && Math.abs(state - rendered) < 1e-4) return;
      rendered = state;
    }
    renderer.render(scene, camera);
  };

  canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(frame);
    document.documentElement.classList.remove('has-3d', 'is-ready');
  });

  // Compila os materiais sem travar a página, para o primeiro quadro não congelar a rolagem.
  await breathe();
  await renderer.compileAsync(scene, camera);

  frame = requestAnimationFrame(tick);
  document.documentElement.classList.add('is-ready');
}
