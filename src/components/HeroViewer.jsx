import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { LoaderCircle } from "lucide-react";
import { Dropdown } from "./ui.jsx";
import { datasetById, fileUrl } from "../datasets.js";

// A hero as the game dresses it: its model with the models of its default items worn on its skeleton
// (the items' bones are the hero's, by name), playing the hero's animations. models: entries of
// dota2-models, the hero's first; each is read from its gzipped copy where there is one
async function loadGlb(entry, loader, signal) {
  const ds = datasetById(entry.ds || "models");
  const res = await fetch(fileUrl(ds, entry.hasGz ? `${entry.path}.gz` : entry.path), { signal });
  if (!res.ok) throw new Error(`${res.status} ${entry.path}`);
  const body = entry.hasGz ? res.body.pipeThrough(new DecompressionStream("gzip")) : res.body;
  return loader.parseAsync(await new Response(body).arrayBuffer(), "");
}

// Hangs an item on the hero: what hangs from a bone the hero has (unknown bones such as a cape's,
// meshes on a bone) moves under the hero's bone, and skinned meshes take the hero's bones by name
function wear(item, bones) {
  const moves = [];
  item.traverse((o) => {
    if (o.parent?.isBone && bones.has(o.parent.name) && !(o.isBone && bones.has(o.name))) moves.push(o);
  });
  for (const o of moves) bones.get(o.parent.name).add(o);
  item.traverse((o) => {
    if (o.isSkinnedMesh) {
      const sk = o.skeleton;
      o.bind(new THREE.Skeleton(sk.bones.map((b) => bones.get(b.name) || b), sk.boneInverses), o.bindMatrix);
    }
  });
}

function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}

// The plain idle: "idle", then "<hero>_idle", then any idle that is not a loadout's, an event's or injured
const idleOf = (names) =>
  names.find((n) => n.toLowerCase() === "idle") ||
  names.find((n) => /^[a-z]+_idle$/i.test(n) && !/loadout/i.test(n)) ||
  names.find((n) => /idle/i.test(n) && !/injured|rare|alt|loadout|\d/i.test(n)) ||
  names.find((n) => /idle/i.test(n)) ||
  names[0] ||
  "";

// bare: no backdrop of its own (the page behind lights it); showcase: a still picture for a page, no
// controls, no animation picker, no loading sign, turned by turn.current (radians, read each frame);
// onReady when the model stands
export default function HeroViewer({ models, bare = false, showcase = false, turn, onReady }) {
  const host = useRef(null);
  const stage = useRef(null);
  const [status, setStatus] = useState("loading");
  const [clips, setClips] = useState([]);
  const [clip, setClip] = useState("");
  const [zoomHint, setZoomHint] = useState(false);

  // The renderer, camera, lights and floor, once
  useEffect(() => {
    const el = host.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(28, 1, 1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    if (showcase) controls.enabled = false;
    // The wheel scrolls the page; it zooms only with Ctrl held (a trackpad pinch sends that too).
    // Caught on the host before the canvas, so the controls never see a plain wheel
    let hintTimer = 0;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey || showcase) return;
      e.stopPropagation();
      setZoomHint(true);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => setZoomHint(false), 1200);
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: true });

    const key = new THREE.DirectionalLight(0xfff4e8, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    const rim = new THREE.DirectionalLight(0x9fb8ff, 1.6);
    scene.add(key, key.target, rim, new THREE.HemisphereLight(0xdfe6ff, 0x2a2420, 0.6));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const clock = new THREE.Clock();
    const s = { renderer, scene, camera, controls, key, rim, floor, mixer: null, root: null, actions: {} };
    renderer.setAnimationLoop(() => {
      s.mixer?.update(clock.getDelta());
      if (turn && s.root) s.root.rotation.y += (turn.current - s.root.rotation.y) * 0.12;
      controls.update();
      renderer.render(scene, camera);
    });
    stage.current = s;
    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      el.removeEventListener("wheel", onWheel, { capture: true });
      clearTimeout(hintTimer);
      if (s.root) dispose(s.root);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // The hero and its items, framed
  const key = models.map((m) => m.path).join("|");
  useEffect(() => {
    const s = stage.current;
    const controller = new AbortController();
    setStatus("loading");
    setClips([]);
    (async () => {
      const loader = new GLTFLoader();
      const [hero, ...items] = await Promise.all(models.map((m) => loadGlb(m, loader, controller.signal)));
      if (controller.signal.aborted) return;
      const root = hero.scene;
      const bones = new Map();
      root.traverse((o) => o.isBone && !bones.has(o.name) && bones.set(o.name, o));
      for (const item of items) {
        wear(item.scene, bones);
        root.add(item.scene);
      }
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      if (s.root) {
        s.scene.remove(s.root);
        dispose(s.root);
      }
      s.root = root;
      s.scene.add(root);
      s.mixer = new THREE.AnimationMixer(root);
      s.actions = Object.fromEntries(hero.animations.map((c) => [c.name, c]));
      const names = hero.animations.map((c) => c.name);
      const idle = idleOf(names);
      if (idle) s.mixer.clipAction(s.actions[idle]).play();
      s.mixer.update(0);
      root.updateMatrixWorld(true);

      // Framed by the posed body: the whole height in view, a little room around
      const box = new THREE.Box3().setFromObject(root, true);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.z, size.y) * 0.75;
      // a showcase fills its box, a viewer leaves room around
      const room = showcase ? 0.53 : 0.62;
      const fit = (size.y * room) / Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2));
      const distance = Math.max(fit, (Math.max(size.x, size.z) * room) / Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2)) / Math.max(s.camera.aspect, 0.5));
      s.controls.target.copy(center);
      s.camera.position.set(center.x + distance * 0.18, center.y + size.y * 0.06, center.z + distance);
      s.camera.near = distance / 50;
      s.camera.far = distance * 20;
      s.camera.updateProjectionMatrix();
      s.controls.minDistance = distance * 0.35;
      s.controls.maxDistance = distance * 3;
      s.floor.position.set(center.x, box.min.y, center.z);
      s.floor.scale.setScalar(radius * 2);
      s.key.position.set(center.x - radius * 2, box.max.y + radius * 2, center.z + radius * 2.5);
      s.key.target.position.copy(center);
      const cam = s.key.shadow.camera;
      cam.left = cam.bottom = -radius * 1.5;
      cam.right = cam.top = radius * 1.5;
      cam.near = 1;
      cam.far = radius * 10;
      cam.updateProjectionMatrix();
      s.rim.position.set(center.x + radius * 2, box.max.y + radius, center.z - radius * 3);

      setClips(names);
      setClip(idle);
      setStatus("ready");
      onReady?.();
    })().catch((e) => !controller.signal.aborted && setStatus(`error: ${e.message || e}`));
    return () => controller.abort();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (name) => {
    const s = stage.current;
    setClip(name);
    if (!s.mixer || !s.actions[name]) return;
    s.mixer.stopAllAction();
    s.mixer.clipAction(s.actions[name]).reset().play();
  };

  return (
    <div className={bare ? "absolute inset-0" : "relative h-full w-full bg-[radial-gradient(ellipse_at_50%_40%,#202022_0%,#0f0f11_70%)]"}>
      <div ref={host} className="absolute inset-0" />
      {status !== "ready" && !showcase && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-400">
          {status === "loading" ? <LoaderCircle size={18} className="animate-spin" /> : status}
        </div>
      )}
      {!showcase && (
        <div
          className={`pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-[0.8rem] text-ink-100 backdrop-blur-md transition-opacity duration-300 ${zoomHint ? "opacity-100" : "opacity-0"}`}
        >
          Ctrl + scroll to zoom
        </div>
      )}
      {clips.length > 0 && !showcase && (
        <div className="absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-4">
          <Dropdown
            up
            left
            value={clip}
            onChange={play}
            options={clips.map((c) => [c, c])}
            label="Animation"
            buttonClass="flex h-9 max-w-[16rem] min-w-[9rem] items-center gap-2 rounded-full bg-black/45 pr-3 pl-4 text-[0.82rem] text-ink-100 backdrop-blur-md transition-colors hover:bg-black/65"
          />
        </div>
      )}
    </div>
  );
}
