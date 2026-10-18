import * as ecs from '@8thwall/ecs'

const OBJECT_PLACED_EVENT = 'object-placed'
const OBJECT_REMOVED_EVENT = 'object-removed'

ecs.registerComponent({
  name: 'tap-to-place',
  schema: {
    prefab: 'eid',
  },
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    let placed = false

    defineState('placing')
      .initial()
      .onEnter(() => {
        placed = false
      })
      .onEvent(OBJECT_PLACED_EVENT, 'placed', {target: world.events.globalId})
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (placed || !e.data.worldPosition) {
          return
        }
        const newEid = world.createEntity(schemaAttribute.get(eid).prefab)
        const pos = e.data.worldPosition
        world.setPosition(newEid, pos.x, pos.y, pos.z)
        const quat = ecs.math.quat.yRadians(Math.random() * Math.PI)
        world.setQuaternion(newEid, quat.x, quat.y, quat.z, quat.w)
        placed = true
        world.events.dispatch(world.events.globalId, OBJECT_PLACED_EVENT)
      })

    defineState('placed').onEvent(OBJECT_REMOVED_EVENT, 'placing', {
      target: world.events.globalId,
    })
  },
})

export {
  OBJECT_PLACED_EVENT,
  OBJECT_REMOVED_EVENT,
}
