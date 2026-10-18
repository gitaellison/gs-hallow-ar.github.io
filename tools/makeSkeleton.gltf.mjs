// Generates src/assets/skeleton.glb - a rigid-hierarchy, animated humanoid skeleton.
// No dependencies. Run: node tools/makeSkeleton.gltf.mjs
import {writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- buffer assembly (4-byte aligned views) ----------
const chunks = [];
let offset = 0;
function addView(data, target) {
  // pad to 4 bytes
  const pad = (4 - (offset % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    offset += pad;
  }
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  chunks.push(buf);
  const view = {buffer: 0, byteOffset: offset, byteLength: buf.byteLength};
  if (target) view.target = target;
  offset += buf.byteLength;
  const index = bufferViews.push(view) - 1;
  return index;
}
const bufferViews = [];
const accessors = [];
function addAccessor(view, type, componentType, count, min, max) {
  const acc = {bufferView: view, componentType, count, type};
  if (min) acc.min = min;
  if (max) acc.max = max;
  accessors.push(acc);
  return accessors.length - 1;
}

// ---------- unit box geometry (shared by every bone) ----------
// 24 verts (4 per face), normals outward. Extent [-0.5, 0.5].
const faces = [
  {n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]},
  {n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]]},
  {n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]]},
  {n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]]},
  {n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]]},
  {n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]]},
];
const posArr = [];
const nrmArr = [];
const idxArr = [];
for (let f = 0; f < 6; f++) {
  for (let k = 0; k < 4; k++) {
    posArr.push(...faces[f].v[k]);
    nrmArr.push(...faces[f].n);
  }
  const b = f * 4;
  idxArr.push(b, b + 1, b + 2, b, b + 2, b + 3);
}
const positions = new Float32Array(posArr);
const normals = new Float32Array(nrmArr);
const indices = new Uint16Array(idxArr);
const posMin = [-0.5, -0.5, -0.5];
const posMax = [0.5, 0.5, 0.5];
const POS = addAccessor(addView(positions, 34962), 'VEC3', 5126, 24, posMin, posMax);
const NRM = addAccessor(addView(normals, 34962), 'VEC3', 5126, 24);
const IDX = addAccessor(addView(indices, 34963), 'SCALAR', 5123, 36);

// ---------- materials ----------
function hex(c) {
  return [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255, 1];
}
const materials = [
  {pbrMetallicRoughness: {baseColorFactor: hex('#EFE6C8'), metallicFactor: 0.0, roughnessFactor: 0.75}}, // bone
  {pbrMetallicRoughness: {baseColorFactor: hex('#141414'), metallicFactor: 0.0, roughnessFactor: 0.9}}, // sockets
];

// ---------- nodes ----------
const nodes = [];
const joints = [];
const jointIndex = {};
function meshNode(name, translation, scale, material) {
  nodes.push({name, translation, scale, mesh: 0, extras: {part: true}});
  void material;
  return nodes.length - 1;
}
function joint(name, translation, parentIdx) {
  nodes.push({name, translation: translation ?? [0, 0, 0], rotation: [0, 0, 0, 1], children: []});
  const idx = nodes.length - 1;
  if (parentIdx !== undefined) nodes[parentIdx].children.push(idx);
  joints.push(idx);
  jointIndex[name] = idx;
  return idx;
}
function attach(parentIdx, childIdx) {
  nodes[parentIdx].children.push(childIdx);
}

// bone helper: a box positioned along -Y from the joint origin, length `len`
function bone(parent, name, {tx = 0, len, w = 0.07, d = 0.07, tilt = 0}) {
  const m = meshNode(name + '_bone', [tx, -len / 2, 0], [w, len, d]);
  if (tilt) nodes[m].rotation = quat('y', tilt);
  attach(parent, m);
  return m;
}

// skeleton hierarchy (feet at y=0, faces -Z like the template's camera convention)
const hips = joint('hips', [0, 0.98, 0]);
const spine = joint('spine', [0, 0.12, 0], hips);
const chest = joint('chest', [0, 0.14, 0], spine);
const neck = joint('neck', [0, 0.20, 0], chest);
const head = joint('head', [0, 0.08, 0], neck);

// pelvis + spine + ribcage
bone(hips, 'pelvis', {len: 0.14, w: 0.26, d: 0.16});
bone(spine, 'abdomen', {len: 0.16, w: 0.20, d: 0.14});
const ribcage = meshNode('ribcage', [0, 0.08, 0], [0.30, 0.22, 0.18]);
attach(chest, ribcage);
for (const [i, yy] of [0.0, 0.07, 0.14].entries()) {
  const rib = meshNode('rib' + i, [0, yy, 0], [0.34, 0.028, 0.20]);
  attach(chest, rib);
}
// clavices
attach(chest, meshNode('clavL', [0.12, 0.16, 0], [0.18, 0.04, 0.05]));
attach(chest, meshNode('clavR', [-0.12, 0.16, 0], [0.18, 0.04, 0.05]));
// scapulae
attach(chest, meshNode('scapL', [0.20, 0.10, -0.02], [0.10, 0.12, 0.04]));
attach(chest, meshNode('scapR', [-0.20, 0.10, -0.02], [0.10, 0.12, 0.04]));
// neck vertebrae
attach(neck, meshNode('neckBones', [0, 0.03, 0], [0.07, 0.09, 0.07]));

// skull group (children of head joint, positioned relative)
const skull = meshNode('skull', [0, 0.10, -0.01], [0.19, 0.22, 0.21]);
attach(head, skull);
const jaw = joint('jaw', [0, 0.0, 0], head);
attach(jaw, meshNode('jawBone', [0, -0.015, -0.06], [0.13, 0.05, 0.12]));
// eye sockets + nasal + teeth (dark accents)
attach(head, dark(meshNode('eyeL', [0.055, 0.12, -0.105], [0.05, 0.05, 0.02])));
attach(head, dark(meshNode('eyeR', [-0.055, 0.12, -0.105], [0.05, 0.05, 0.02])));
attach(head, dark(meshNode('nose', [0, 0.07, -0.11], [0.03, 0.045, 0.02])));
attach(head, meshNode('teeth', [0, -0.015, -0.09], [0.11, 0.03, 0.02]));

function dark(n) {
  nodes[n].extras = {socket: true};
  return n;
}

// arms: shoulder -> upperArm -> lowerArm -> hand
for (const side of ['L', 'R']) {
  const sx = side === 'L' ? 1 : -1;
  const sh = joint('shoulder' + side, [0.19 * sx, 0.16, 0], chest);
  const ua = joint('upperArm' + side, [0.03 * sx, -0.02, 0], sh);
  bone(ua, 'humerus' + side, {len: 0.28, w: 0.055, d: 0.055});
  const la = joint('lowerArm' + side, [0, -0.28, 0], ua);
  bone(la, 'radius' + side, {len: 0.25, w: 0.045, d: 0.045});
  const ha = joint('hand' + side, [0, -0.26, 0], la);
  attach(ha, meshNode('hand' + side, [0, -0.05, 0], [0.06, 0.10, 0.03]));
  attach(ha, meshNode('fingers' + side, [0, -0.13, 0], [0.055, 0.07, 0.02]));
}

// legs: hip -> upperLeg -> lowerLeg -> foot
for (const side of ['L', 'R']) {
  const sx = side === 'L' ? 1 : -1;
  const ul = joint('upperLeg' + side, [0.10 * sx, -0.03, 0], hips);
  bone(ul, 'femur' + side, {len: 0.44, w: 0.07, d: 0.07});
  const ll = joint('lowerLeg' + side, [0, -0.44, 0], ul);
  bone(ll, 'tibia' + side, {len: 0.42, w: 0.055, d: 0.055});
  const ft = joint('foot' + side, [0, -0.42, 0], ll);
  attach(ft, meshNode('heel' + side, [0, -0.045, 0.02], [0.07, 0.06, 0.10]));
  attach(ft, meshNode('toes' + side, [0, -0.045, -0.10], [0.07, 0.04, 0.10]));
}

// ---------- animation ----------
const DUR = 3.2;
const N = 17;
const times = new Float32Array(N);
for (let i = 0; i < N; i++) times[i] = (i / (N - 1)) * DUR;
const TIME_ACC = addAccessor(addView(times), 'SCALAR', 5126, N);

function quat(axis, a) {
  const h = a / 2;
  const s = Math.sin(h);
  const q = [0, 0, 0, Math.cos(h)];
  if (axis === 'x') q[0] = s;
  else if (axis === 'y') q[1] = s;
  else q[2] = s;
  return q;
}
const W = (2 * Math.PI) / DUR;
const samplers = [];
const channels = [];
let inputCounter = 0;
function rotateTrack(nodeName, axis, fn) {
  const out = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const t = times[i];
    const q = quat(axis, fn(t));
    out.set(q, i * 4);
  }
  const acc = addAccessor(addView(out), 'VEC4', 5126, N);
  samplers.push({input: TIME_ACC, interpolation: 'LINEAR', output: acc});
  channels.push({sampler: samplers.length - 1, target: {node: jointIndex[nodeName], path: 'rotation'}});
}
function translateTrack(nodeName, fn) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    out.set(fn(times[i]), i * 3);
  }
  const acc = addAccessor(addView(out), 'VEC3', 5126, N);
  samplers.push({input: TIME_ACC, interpolation: 'LINEAR', output: acc});
  channels.push({sampler: samplers.length - 1, target: {node: jointIndex[nodeName], path: 'translation'}});
}

// the "creepy candlelit sway": weight shift, arm swing, knee bend, head tilt, jaw chatter
translateTrack('hips', (t) => [0.03 * Math.sin(W * t), 0.98 + 0.025 * Math.sin(2 * W * t + 0.6), 0]);
rotateTrack('hips', 'y', (t) => 0.10 * Math.sin(W * t));
rotateTrack('spine', 'x', (t) => 0.05 + 0.04 * Math.sin(W * t + 1.2));
rotateTrack('chest', 'x', (t) => -0.04 + 0.05 * Math.sin(2 * W * t));
rotateTrack('chest', 'y', (t) => 0.12 * Math.sin(W * t + 0.5));
rotateTrack('neck', 'x', (t) => -0.06 + 0.05 * Math.sin(2 * W * t + 1.0));
rotateTrack('head', 'z', (t) => 0.10 * Math.sin(W * t + 0.8));
rotateTrack('head', 'x', (t) => 0.06 * Math.sin(2 * W * t));
rotateTrack('jaw', 'x', (t) => 0.06 + 0.06 * Math.abs(Math.sin(3.2 * W * t)));
// arms: swing forward/back with slight outward sway, elbows bent
rotateTrack('upperArmL', 'x', (t) => 0.55 * Math.sin(W * t));
rotateTrack('upperArmL', 'z', (t) => -0.22 + 0.05 * Math.sin(2 * W * t));
rotateTrack('lowerArmL', 'x', (t) => -0.45 - 0.25 * Math.sin(W * t + 0.9));
rotateTrack('upperArmR', 'x', (t) => 0.55 * Math.sin(W * t + Math.PI));
rotateTrack('upperArmR', 'z', (t) => 0.22 - 0.05 * Math.sin(2 * W * t));
rotateTrack('lowerArmR', 'x', (t) => -0.45 - 0.25 * Math.sin(W * t + 0.9 + Math.PI));
// legs: tiny marching knees
rotateTrack('upperLegL', 'x', (t) => 0.16 * Math.sin(W * t + Math.PI));
rotateTrack('lowerLegL', 'x', (t) => 0.10 + 0.12 * Math.max(0, Math.sin(W * t + Math.PI - 1.2)));
rotateTrack('upperLegR', 'x', (t) => 0.16 * Math.sin(W * t));
rotateTrack('lowerLegR', 'x', (t) => 0.10 + 0.12 * Math.max(0, Math.sin(W * t - 1.2)));

void inputCounter;

// ---------- glTF JSON ----------
const meshes = [
  {
    name: 'boneBox',
    primitives: [{attributes: {POSITION: POS, NORMAL: NRM}, indices: IDX, material: 0}],
  },
];
// socket meshes reuse geometry with dark material via a second primitive mesh
const meshes2 = [
  {
    name: 'socketBox',
    primitives: [{attributes: {POSITION: POS, NORMAL: NRM}, indices: IDX, material: 1}],
  },
];
// retarget: mesh 0 = bone, mesh index 1 = socket for nodes tagged in extras
for (const n of nodes) {
  if (n.extras && n.extras.socket) {
    n.mesh = 1;
    delete n.extras;
  }
}
nodes.forEach((n) => {
  if (n.children && n.children.length === 0) delete n.children;
});

const buffer = Buffer.concat(chunks);
const gltf = {
  asset: {version: '2.0', generator: 'skelebone procedural skeleton'},
  scene: 0,
  scenes: [{name: 'skeleton', nodes: [hips]}],
  nodes,
  meshes: [...meshes, ...meshes2],
  materials,
  accessors,
  bufferViews,
  buffers: [{byteLength: buffer.length}],
  animations: [{name: 'CreepySway', samplers, channels}],
};

// ---------- GLB packaging ----------
const jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const json = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
const binPad = (4 - (buffer.length % 4)) % 4;
const bin = Buffer.concat([buffer, Buffer.alloc(binPad, 0)]);
const total = 12 + 8 + json.length + 8 + bin.length;
const out = Buffer.alloc(total);
let o = 0;
out.writeUInt32LE(0x46546c67, o); o += 4; // glTF
out.writeUInt32LE(2, o); o += 4;
out.writeUInt32LE(total, o); o += 4;
out.writeUInt32LE(json.length, o); o += 4;
out.writeUInt32LE(0x4e4f534a, o); o += 4; // JSON
json.copy(out, o); o += json.length;
out.writeUInt32LE(bin.length, o); o += 4;
out.writeUInt32LE(0x004e4942, o); o += 4; // BIN
bin.copy(out, o);

const target = resolve(root, 'src/assets/skeleton.glb');
writeFileSync(target, out);

// self-check: reparse
const back = JSON.parse(out.subarray(20, 20 + json.length).toString('utf8'));
const jointsInAnim = new Set(back.animations[0].channels.map((c) => c.target.node));
console.log('wrote', target, out.length, 'bytes');
console.log('nodes:', back.nodes.length, 'joints:', joints.length, 'animated joints:', jointsInAnim.size,
  'channels:', back.animations[0].channels.length, 'accessors:', back.accessors.length);
