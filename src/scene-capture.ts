import * as ecs from '@8thwall/ecs'

let capturedWorld: ecs.World | null = null

ecs.registerComponent({
  name: 'scene-capture',
  stateMachine: ({world, defineState}) => {
    capturedWorld = world
    defineState('idle').initial()
  },
})

export const takeScenePhoto = async (): Promise<Blob | null> => {
  if (!capturedWorld) {
    return null
  }
  try {
    return await capturedWorld.xr.takeScreenshot()
  } catch (err) {
    console.warn('scene capture failed', err)
    return null
  }
}
