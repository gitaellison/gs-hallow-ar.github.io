const MUSIC_URL = './assets/bombinsound-halloween-suspense-horror-version-5-halloween-waltz-619342.mp3'
const MUSIC_VOLUME = 0.35

const audio = new Audio(MUSIC_URL)
audio.loop = true
audio.preload = 'none'
audio.volume = MUSIC_VOLUME

let cameraActive = false

const sync = () => {
  if (cameraActive && !document.hidden) {
    audio.play().catch(() => {})
  } else {
    audio.pause()
  }
}

const onxrloaded = () => {
  const XR8 = (window as any).XR8
  XR8.addCameraPipelineModule({
    name: 'background-music',
    onStart: () => {
      cameraActive = true
      sync()
    },
    onExit: () => {
      cameraActive = false
      sync()
    },
  })
}

document.addEventListener('visibilitychange', sync)

if ((window as any).XR8) {
  onxrloaded()
} else {
  window.addEventListener('xrloaded', onxrloaded)
}

export {}
