import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface Creature {
  label: string
  url: string
  scale: number
}

const CREATURES: Creature[] = [
  {label: 'Skeleton', url: './assets/full-adult-skeleton-standing.glb', scale: 0.85},
  {label: 'Curious', url: './assets/curious_skeleton.glb', scale: 1},
  {label: 'Ghost', url: './assets/halloween_ghost.glb', scale: 1},
  {label: 'Knight', url: './assets/halloween_pumpkin_lantern_knight.glb', scale: 1},
  {label: 'Pumpkin', url: './assets/jack-o-lantern.glb', scale: 1},
  {label: 'Cat', url: './assets/the_halloween_cat.glb', scale: 1},
]

const TARGET_HEIGHT = 1.6
const ICON_SIZE = 88

let selectedIndex = 0

export const getSelectedCreature = (): Creature => CREATURES[selectedIndex]

const renderIcon = (
  renderer: THREE.WebGLRenderer,
  loader: GLTFLoader,
  creature: Creature,
  img: HTMLImageElement
) => {
  loader.load(
    creature.url,
    (gltf) => {
      const model = gltf.scene
      model.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.frustumCulled = false
        }
      })

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) {
        creature.scale = Math.min(5, Math.max(0.2, TARGET_HEIGHT / maxDim))
      }

      const scene = new THREE.Scene()
      scene.add(model)
      scene.add(new THREE.AmbientLight(0xffffff, 1.4))
      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(1, 2, 1.5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0xbfd4ff, 1.2)
      rim.position.set(-1.5, 0.8, -1.2)
      scene.add(rim)

      const camera = new THREE.PerspectiveCamera(40, 1, 0.01, maxDim * 20)
      const dir = new THREE.Vector3(1, 0.5, 1).normalize().multiplyScalar(maxDim * 2.2)
      camera.position.copy(center).add(dir)
      camera.lookAt(center)

      renderer.setSize(ICON_SIZE, ICON_SIZE)
      renderer.setClearColor(0x000000, 0)
      renderer.render(scene, camera)
      img.src = renderer.domElement.toDataURL()
      img.style.opacity = '1'

      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry?.dispose()
          const mat = mesh.material
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose())
          } else if (mat) {
            mat.dispose()
          }
        }
      })
    },
    undefined,
    (err) => console.warn('creature icon failed', creature.url, err)
  )
}

const buildPicker = () => {
  const bar = document.createElement('div')
  Object.assign(bar.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    zIndex: '1000',
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
    background: 'rgba(18, 16, 26, 0.4)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.22)',
    fontFamily: 'Roboto, sans-serif',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  } as Partial<CSSStyleDeclaration>)

  const stop = (e: Event) => e.stopPropagation()
  bar.addEventListener('pointerdown', stop)
  bar.addEventListener('pointermove', stop)
  bar.addEventListener('pointerup', stop)
  bar.addEventListener('pointercancel', stop)
  bar.addEventListener('click', stop)

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(ICON_SIZE, ICON_SIZE)
  const loader = new GLTFLoader()

  const buttons: HTMLElement[] = []

  const updateSelection = () => {
    buttons.forEach((btn, i) => {
      const selected = i === selectedIndex
      btn.style.background = selected ? 'rgba(255, 138, 0, 0.85)' : 'rgba(255, 255, 255, 0.12)'
      btn.style.border = selected
        ? '2px solid #ffd166'
        : '2px solid rgba(255, 255, 255, 0.25)'
    })
  }

  CREATURES.forEach((creature, i) => {
    const btn = document.createElement('div')
    Object.assign(btn.style, {
      flex: '0 0 auto',
      width: '76px',
      padding: '6px 4px 4px',
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      cursor: 'pointer',
      transition: 'background 0.15s ease',
    } as Partial<CSSStyleDeclaration>)

    const icon = document.createElement('img')
    Object.assign(icon.style, {
      width: `${ICON_SIZE - 20}px`,
      height: `${ICON_SIZE - 20}px`,
      objectFit: 'contain',
      opacity: '0',
      transition: 'opacity 0.25s ease',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>)

    const label = document.createElement('span')
    label.textContent = creature.label
    Object.assign(label.style, {
      color: '#ffffff',
      fontSize: '11px',
      lineHeight: '1',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    } as Partial<CSSStyleDeclaration>)

    btn.addEventListener('click', () => {
      selectedIndex = i
      updateSelection()
    })

    btn.append(icon, label)
    bar.appendChild(btn)
    buttons.push(btn)

    setTimeout(() => renderIcon(renderer, loader, creature, icon), 600 * i)
  })

  updateSelection()
  document.body.appendChild(bar)
}

if (document.body) {
  buildPicker()
} else {
  document.addEventListener('DOMContentLoaded', buildPicker)
}

export {}
