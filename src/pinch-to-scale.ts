import * as ecs from '@8thwall/ecs'
import { Logo } from './logo'

const logoQuery = ecs.defineQuery([Logo])

ecs.registerComponent({
  name: 'pinch-to-scale',
  schema: {
    minScale: ['f32', 0.3],
    maxScale: ['f32', 5]
  },
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    let initialSpread = 0
    let isPinching = false

    defineState('idle').initial()
      .listen(eid, ecs.input.GESTURE_START, (e) => {
        if (e.data.touchCount >= 2) {
          initialSpread = e.data.spread
          isPinching = true
        }
      })
      .listen(eid, ecs.input.GESTURE_MOVE, (e) => {
        if (!isPinching || e.data.touchCount < 2) return

        const skeletons = logoQuery(world)
        if (skeletons.length === 0) return

        const skeletonEid = skeletons[0]
        const worldMat = ecs.math.mat4.i()
        world.transform.getWorldTransform(skeletonEid, worldMat)
        const decomposed = worldMat.decomposeTrs()
        const currentScale = decomposed.s.x

        const spreadRatio = e.data.spread / initialSpread
        const newScale = Math.max(
          schemaAttribute.get(eid).minScale,
          Math.min(schemaAttribute.get(eid).maxScale, currentScale * spreadRatio)
        )

        world.setScale(skeletonEid, newScale, newScale, newScale)
        initialSpread = e.data.spread
      })
      .listen(eid, ecs.input.GESTURE_END, (e) => {
        isPinching = false
      })
  }
})

export {}
