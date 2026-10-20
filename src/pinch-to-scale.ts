import * as ecs from '@8thwall/ecs'
import {isActiveCreature} from './interaction-state'

const PinchToScale = ecs.registerComponent({
  name: 'pinch-to-scale',
  schema: {
    minScale: ['f32', 0.3],
    maxScale: ['f32', 5],
  },
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    let initialSpread = 0
    let baseScale = 1

    const currentScale = () => {
      const worldMat = ecs.math.mat4.i()
      world.transform.getWorldTransform(eid, worldMat)
      return worldMat.decomposeTrs().s.x
    }

    defineState('idle').initial()
      .listen(world.events.globalId, ecs.input.GESTURE_START, (e) => {
        if (e.data.touchCount >= 2 && isActiveCreature(eid)) {
          initialSpread = e.data.spread
          baseScale = currentScale()
        }
      })
      .listen(world.events.globalId, ecs.input.GESTURE_MOVE, (e) => {
        if (e.data.touchCount < 2 || initialSpread <= 0 || !isActiveCreature(eid)) return

        const {minScale, maxScale} = schemaAttribute.get(eid)
        const newScale = Math.max(
          baseScale * minScale,
          Math.min(baseScale * maxScale, baseScale * (e.data.spread / initialSpread))
        )
        world.setScale(eid, newScale, newScale, newScale)
      })
      .listen(world.events.globalId, ecs.input.GESTURE_END, () => {
        initialSpread = 0
      })
  },
})



export {PinchToScale}
