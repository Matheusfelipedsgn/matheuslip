import {
  Box3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
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
const DIM = new Color('#141518');
const { smoothstep, lerp, clamp } = MathUtils;

// Direção em que cada peça se afasta, na ordem do SVG: bloco superior, bloco inferior, traço principal.
const SCATTER = [
  { move: new Vector3(-74, 66, 60), spin: new Vector3(0.5, -0.65, 0.28) },
  { move: new Vector3(74, -66, 60), spin: new Vector3(-0.45, 0.6, -0.3) },
  { move: new Vector3(0, 0, -34), spin: new Vector3(0.08, 0.12, -0.08) },
];

// Serviço em destaque -> peça: traço principal, bloco superior, bloco inferior.
const SERVICE_PIECE = [2, 0, 1];

type Pose = {
  x: number; // centro da peça, em fração do palco
  y: number;
  size: number; // largura, em unidades do mundo
  rotX: number;
  rotY: number;
  scatter: number;
  highlight: number; // índice da peça acesa; -1 acende todas
};

function buildSymbol() {
  const pivot = new Group();
  const { paths } = new SVGLoader().parse(symbolSvg.replace('currentColor', '#000'));
  const box = new Box3();
  const pieces: { mesh: Mesh; material: MeshPhysicalMaterial; home: Vector3 }[] = [];

  for (const path of paths) {
    const material = new MeshPhysicalMaterial({
      color: LIME.clone(),
      metalness: 0,
      roughness: 0.42,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
    });
    const geometry = new ExtrudeGeometry(path.toShapes(true), {
      depth: 44,
      bevelEnabled: true,
      bevelSize: 2.4,
      bevelThickness: 3.2,
      bevelSegments: 5,
      curveSegments: 24,
    });
    // O SVG tem o eixo Y para baixo. Girar (em vez de espelhar) mantém as normais corretas.
    geometry.rotateX(Math.PI);
    const mesh = new Mesh(geometry, material);
    pivot.add(mesh);
    box.expandByObject(mesh);
    pieces.push({ mesh, material, home: new Vector3() });
  }

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

export function startScene3d(canvas: HTMLCanvasElement) {
  const sections = {
    hero: document.querySelector<HTMLElement>('[data-track="hero"]')!,
    services: document.querySelector<HTMLElement>('[data-track="services"]')!,
    process: document.querySelector<HTMLElement>('[data-track="process"]')!,
  };
  const names = Object.keys(sections) as (keyof typeof sections)[];
  const stages = Object.fromEntries(
    names.map((name) => [name, sections[name].querySelector<HTMLElement>('[data-stage]')!]),
  ) as Record<keyof typeof sections, HTMLElement>;

  const heroFirst = sections.hero.querySelector<HTMLElement>('[data-first]')!;
  const heroSecond = sections.hero.querySelector<HTMLElement>('[data-second]')!;
  const serviceItems = [...sections.services.querySelectorAll<HTMLElement>('[data-item]')];
  const stepItems = [...sections.process.querySelectorAll<HTMLElement>('[data-item]')];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  // Sem tone mapping: a face frontal precisa chegar perto do lime da marca (#C6F000).
  renderer.toneMapping = NoToneMapping;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.3;

  const key = new DirectionalLight('#ffffff', 2.1);
  key.position.set(-1.5, 1.5, 8);
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

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewH = 2 * Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z;
    viewW = viewH * camera.aspect;
    narrow = w < 900;
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const progressOf = (name: keyof typeof sections) => {
    const rect = sections[name].getBoundingClientRect();
    const range = rect.height - stages[name].offsetHeight;
    return range > 0 ? clamp(-rect.top / range, 0, 1) : 0;
  };

  const setBlock = (element: HTMLElement, opacity: number, shift: number) => {
    element.style.opacity = String(opacity);
    element.style.transform = `translateY(${shift}px)`;
    element.style.visibility = opacity < 0.02 ? 'hidden' : 'visible';
  };

  const setActive = (items: HTMLElement[], index: number) => {
    items.forEach((item, i) => item.classList.toggle('is-active', i === index));
  };

  const poses: Record<keyof typeof sections, (p: number) => Pose> = {
    hero(p) {
      const eased = smoothstep(p, 0, 1);
      setBlock(heroFirst, 1 - smoothstep(p, 0.22, 0.42), -40 * smoothstep(p, 0.22, 0.42));
      const reveal = smoothstep(p, 0.62, 0.84);
      setBlock(heroSecond, reveal, 40 * (1 - reveal));
      return {
        x: narrow ? 0.5 : lerp(0.75, 0.25, eased),
        y: narrow ? 0.25 : 0.5,
        size: narrow ? Math.min(viewW * 0.6, viewH * 0.3) : Math.min(viewW * 0.4, viewH * 0.62),
        rotX: 0.14,
        rotY: -0.42 + eased * Math.PI * 2,
        scatter: 0,
        highlight: -1,
      };
    },
    services(p) {
      const index = Math.min(serviceItems.length - 1, Math.floor(p * serviceItems.length));
      setActive(serviceItems, index);
      return {
        x: narrow ? 0.5 : 0.74,
        y: narrow ? 0.24 : 0.5,
        size: narrow ? Math.min(viewW * 0.5, viewH * 0.26) : Math.min(viewW * 0.3, viewH * 0.5),
        rotX: 0.2,
        rotY: lerp(-0.6, 0.5, p),
        scatter: 1,
        highlight: SERVICE_PIECE[index],
      };
    },
    process(p) {
      setActive(stepItems, Math.min(stepItems.length - 1, Math.floor(p * stepItems.length)));
      const eased = smoothstep(p, 0.04, 0.82);
      return {
        x: narrow ? 0.5 : 0.25,
        y: narrow ? 0.24 : 0.5,
        size: narrow ? Math.min(viewW * 0.42, viewH * 0.2) : Math.min(viewW * 0.3, viewH * 0.5),
        rotX: lerp(0.6, 0.12, eased),
        rotY: lerp(-1.25, -0.24, eased),
        scatter: lerp(1.7, 0, eased),
        highlight: -1,
      };
    },
  };

  let pointerX = 0;
  let pointerY = 0;
  window.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );

  const damped = Object.fromEntries(names.map((name) => [name, progressOf(name)])) as Record<keyof typeof sections, number>;
  let current: keyof typeof sections | null = null;
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
    const damp = 1 - Math.exp(-dt / 110);

    // O objeto pertence ao palco mais próximo de estar fixado. O espaço entre os palcos é
    // maior que a tela, então a troca sempre acontece com ele fora de vista.
    let next: keyof typeof sections | null = null;
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

    if (!next) {
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

    // Só a rotação e a dispersão suavizam: a posição acompanha o palco para a peça rolar com a página.
    const sway = Math.sin(now / 2400) * 0.08;
    const follow = entering ? 1 : damp;
    rotY += (pose.rotY + sway + pointerX * 0.4 - rotY) * follow;
    rotX += (pose.rotX + pointerY * 0.28 + Math.cos(now / 3100) * 0.03 - rotX) * follow;
    scatter += (pose.scatter - scatter) * follow;

    const rect = stages[next].getBoundingClientRect();
    pivot.position.x = ((rect.left + pose.x * rect.width) / canvas.clientWidth - 0.5) * viewW;
    pivot.position.y = -((rect.top + pose.y * rect.height) / canvas.clientHeight - 0.5) * viewH;
    pivot.rotation.set(rotX, rotY, -0.04);
    pivot.scale.setScalar(pose.size / symbolWidth);

    pieces.forEach((piece, index) => {
      const { move, spin } = SCATTER[index];
      piece.mesh.position.copy(piece.home).addScaledVector(move, scatter);
      piece.mesh.rotation.set(spin.x * scatter, spin.y * scatter, spin.z * scatter);
      const lit = pose.highlight === -1 || pose.highlight === index;
      tint.copy(lit ? LIME : DIM);
      const mix = entering ? 1 : 1 - Math.exp(-dt / 160);
      piece.material.color.lerp(tint, mix);
      // Apagada, a peça vira preto brilhante e reflete o ambiente em vez de sumir no fundo.
      piece.material.roughness = lerp(piece.material.roughness, lit ? 0.42 : 0.16, mix);
      piece.material.clearcoat = lerp(piece.material.clearcoat, lit ? 0.25 : 1, mix);
      piece.material.envMapIntensity = lerp(piece.material.envMapIntensity, lit ? 1 : 3.2, mix);
    });

    renderer.render(scene, camera);
  };

  canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(frame);
    document.documentElement.classList.remove('has-3d', 'is-ready');
  });

  frame = requestAnimationFrame(tick);
  document.documentElement.classList.add('is-ready');
}
