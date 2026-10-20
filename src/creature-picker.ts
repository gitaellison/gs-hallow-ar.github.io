import {takeScenePhoto} from './scene-capture'

export interface Creature {
  label: string
  url: string
  icon: string
  scale: number
  // Rotation corrections in DEGREES to make the model stand upright.
  // If a creature spawns wrong on device, tweak these (e.g. fixX -90 => 90, or flip true).
  fixX: number
  fixZ: number
  flip: boolean
}

const CAMERA_SVG =
  '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
  '<path fill="#ffffff" d="M9.2 3 7.4 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.4l-1.8-2H9.2zM12 8a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z"/></svg>'

const CREATURES: Creature[] = [
  {
    label: 'Skeleton',
    url: './assets/skeleton.glb',
    icon: './assets/skeleton.png',
    scale: 1.0296,
    fixX: -90,
    fixZ: 0,
    flip: false,
  },
  {
    label: 'Ghost',
    url: './assets/ghost.glb',
    icon: './assets/ghost.png',
    scale: 0.9324,
    fixX: -90,
    fixZ: 0,
    flip: false,
  },
  {
    label: 'Pumpkin',
    url: './assets/halloween_pumpkin.glb',
    icon: './assets/pumpkin.png',
    scale: 0.0133,
    fixX: -90,
    fixZ: 0,
    flip: false,
  },
  {
    label: 'Halloween',
    url: './assets/halloween_minecraft_logo.glb',
    icon: './assets/halloween.png',
    scale: 0.325,
    fixX: -90,
    fixZ: 0,
    flip: false,
  },
]

let selectedIndex = 0
const placedUrls = new Set<string>()
let refreshUI: () => void = () => {}
let pickerBar: HTMLDivElement | null = null

export const getSelectedCreature = (): Creature => CREATURES[selectedIndex]
export const isPlaced = (url: string): boolean => placedUrls.has(url)
export const markPlaced = (url: string) => {
  placedUrls.add(url)
  refreshUI()
}
export const clearPlaced = () => {
  placedUrls.clear()
  refreshUI()
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
    gap: '6px',
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

  const buttons: HTMLElement[] = []
  const icons: HTMLElement[] = []

  const updateSelection = () => {
    buttons.forEach((btn, i) => {
      const selected = i === selectedIndex
      btn.style.background = selected ? 'rgba(255, 138, 0, 0.85)' : 'rgba(255, 255, 255, 0.12)'
      btn.style.border = selected
        ? '2px solid #ffd166'
        : '2px solid rgba(255, 255, 255, 0.25)'
      btn.style.opacity = isPlaced(CREATURES[i].url) ? '0.55' : '1'
    })
  }

  CREATURES.forEach((creature, i) => {
    const btn = document.createElement('div')
    Object.assign(btn.style, {
      flex: '0 0 auto',
      width: '66px',
      padding: '5px 3px 3px',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      cursor: 'pointer',
      transition: 'background 0.15s ease, opacity 0.15s ease',
    } as Partial<CSSStyleDeclaration>)

    const icon = document.createElement('img')
    Object.assign(icon.style, {
      width: '46px',
      height: '46px',
      objectFit: 'contain',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>)
    icon.src = creature.icon
    icon.alt = creature.label

    const label = document.createElement('span')
    label.textContent = creature.label
    Object.assign(label.style, {
      color: '#ffffff',
      fontSize: '10px',
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
    icons.push(icon)
  })

  updateSelection()
  refreshUI = updateSelection
  bar.style.display = 'none'
  pickerBar = bar
  document.body.appendChild(bar)

  addCaptureButton(bar)
}

const flashScreen = () => {
  const flash = document.createElement('div')
  Object.assign(flash.style, {
    position: 'fixed',
    inset: '0',
    background: '#ffffff',
    opacity: '0.9',
    zIndex: '2000',
    pointerEvents: 'none',
    transition: 'opacity 0.4s ease',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(flash)
  requestAnimationFrame(() => {
    flash.style.opacity = '0'
  })
  setTimeout(() => flash.remove(), 450)
}

const showPhotoModal = (blob: Blob) => {
  const url = URL.createObjectURL(blob)

  const modal = document.createElement('div')
  Object.assign(modal.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.88)',
    zIndex: '2001',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '20px',
    fontFamily: 'Roboto, sans-serif',
  } as Partial<CSSStyleDeclaration>)

  const img = document.createElement('img')
  Object.assign(img.style, {
    maxWidth: '86vw',
    maxHeight: '62vh',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  } as Partial<CSSStyleDeclaration>)
  img.src = url

  const actions = document.createElement('div')
  Object.assign(actions.style, {
    display: 'flex',
    gap: '12px',
  } as Partial<CSSStyleDeclaration>)

  const save = document.createElement('div')
  save.textContent = 'Save'
  Object.assign(save.style, {
    padding: '12px 22px',
    borderRadius: '12px',
    background: 'rgba(255, 138, 0, 0.9)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    border: '2px solid #ffd166',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>)

  const fallbackDownload = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = 'halloween-ar-scene.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  save.addEventListener('click', async (e) => {
    e.stopPropagation()
    const file = new File([blob], 'halloween-ar-scene.png', {type: blob.type || 'image/png'})
    const shareData = {files: [file], title: 'Halloween AR Scene'}
    try {
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        fallbackDownload()
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fallbackDownload()
      }
    }
  })

  const close = document.createElement('div')
  close.textContent = 'Close'
  Object.assign(close.style, {
    padding: '12px 22px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.14)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    border: '2px solid rgba(255,255,255,0.3)',
  } as Partial<CSSStyleDeclaration>)
  close.addEventListener('click', (e) => {
    e.stopPropagation()
    URL.revokeObjectURL(url)
    modal.remove()
  })
  modal.addEventListener('click', () => {
    URL.revokeObjectURL(url)
    modal.remove()
  })

  actions.append(save, close)
  modal.append(img, actions)
  document.body.appendChild(modal)
}

const addCaptureButton = (bar: HTMLElement) => {
  const btn = document.createElement('div')
  Object.assign(btn.style, {
    flex: '0 0 auto',
    width: '66px',
    padding: '5px 3px 3px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.12)',
    border: '2px solid rgba(255, 255, 255, 0.25)',
  } as Partial<CSSStyleDeclaration>)

  const icon = document.createElement('div')
  icon.innerHTML = CAMERA_SVG
  Object.assign(icon.style, {
    width: '46px',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>)

  const label = document.createElement('span')
  label.textContent = 'Photo'
  Object.assign(label.style, {
    color: '#ffffff',
    fontSize: '11px',
    lineHeight: '1',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  } as Partial<CSSStyleDeclaration>)

  let busy = false
  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    if (busy) return
    busy = true
    btn.style.opacity = '0.6'
    flashScreen()
    const blob = await takeScenePhoto()
    if (blob !== null) {
      showPhotoModal(blob)
    } else {
      console.warn('no photo captured')
    }
    busy = false
    btn.style.opacity = '1'
  })

  btn.append(icon, label)
  bar.appendChild(btn)
}

const setPickerVisible = (visible: boolean) => {
  if (pickerBar !== null) {
    pickerBar.style.display = visible ? 'flex' : 'none'
  }
}

const onxrloaded = () => {
  const XR8 = (window as any).XR8
  XR8.addCameraPipelineModule({
    name: 'creature-picker-gate',
    onStart: () => setPickerVisible(true),
    onExit: () => setPickerVisible(false),
  })
}

if (document.body) {
  buildPicker()
} else {
  document.addEventListener('DOMContentLoaded', buildPicker)
}

if ((window as any).XR8) {
  onxrloaded()
} else {
  window.addEventListener('xrloaded', onxrloaded)
}
