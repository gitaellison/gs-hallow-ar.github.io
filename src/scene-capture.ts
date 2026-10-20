import * as ecs from '@8thwall/ecs'
import {CaptureHide} from './capture-hide'

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
  const world = capturedWorld
  const hidden: ecs.Eid[] = []
  world.allEntities.forEach((eid) => {
    if (CaptureHide.has(world, eid)) {
      const entity = world.getEntity(eid)
      if (!entity.isHidden()) {
        entity.hide()
        hidden.push(eid)
      }
    }
  })
  try {
    return await world.xr.takeScreenshot()
  } catch (err) {
    console.warn('scene capture failed', err)
    return null
  } finally {
    hidden.forEach((eid) => {
      try {
        world.getEntity(eid).show()
      } catch (_err) {
        // entity may have been deleted; ignore
      }
    })
  }
}
