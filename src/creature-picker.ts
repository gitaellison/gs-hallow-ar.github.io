export interface Creature {
  label: string
  url: string
  icon: string
  scale: number
}

const CREATURES: Creature[] = [
  {
    label: 'Skeleton',
    url: './assets/curious_skeleton.glb',
    icon: './assets/skeleton.png',
    scale: 0.009,
  },
  {
    label: 'Ghost',
    url: './assets/halloween_ghost.glb',
    icon: './assets/ghost.png',
    scale: 0.32,
  },
  {
    label: 'Knight',
    url: './assets/halloween_pumpkin_lantern_knight.glb',
    icon: './assets/pumkinknight.png',
    scale: 0.006,
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
      width: '88px',
      padding: '6px 4px 4px',
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      cursor: 'pointer',
      transition: 'background 0.15s ease, opacity 0.15s ease',
    } as Partial<CSSStyleDeclaration>)

    const icon = document.createElement('img')
    Object.assign(icon.style, {
      width: '64px',
      height: '64px',
      objectFit: 'contain',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>)
    icon.src = creature.icon
    icon.alt = creature.label

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
    icons.push(icon)
  })

  updateSelection()
  refreshUI = updateSelection
  bar.style.display = 'none'
  pickerBar = bar
  document.body.appendChild(bar)
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
