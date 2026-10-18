import * as ecs from '@8thwall/ecs'

const OBJECT_PLACED_EVENT = 'object-placed'
const OBJECT_REMOVED_EVENT = 'object-removed'

const PlacementReticle = ecs.registerComponent({name: 'placement-reticle'})
const reticleQuery = ecs.defineQuery([PlacementReticle])

ecs.registerComponent({
  name: 'tap-to-place',
  schema: {
    prefab: 'eid'
  },
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    let placed = false
    let reticleEid: ecs.Eid | null = null

    const ensureReticle = () => {
      if (reticleEid !== null) return reticleEid
      reticleEid = world.createEntity()
      const entity = world.getEntity(reticleEid)
      entity.hide()
      entity.set(PlacementReticle, {})
      return reticleEid
    }

    defineState('placing').initial()
      .onEnter(() => {
        ensureReticle()
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (!e.data.worldPosition || placed) {
          return
        }
        const newEid = world.createEntity(schemaAttribute.get(eid).prefab)
        const pos = e.data.worldPosition
        world.setPosition(newEid, pos.x, pos.y, pos.z)
        const quat = ecs.math.quat.yRadians(Math.random() * Math.PI)
        world.setQuaternion(newEid, quat.x, quat.y, quat.z, quat.w)
        placed = true
        if (reticleEid !== null) {
          world.getEntity(reticleEid).hide()
        }
        world.events.dispatch(eid, OBJECT_PLACED_EVENT)
      })
      .onTick(() => {
        if (placed || reticleEid === null) return
        const hitPos = world.transform.getWorldPosition(reticleEid, ecs.math.vec3.zero())
        const currentY = hitPos.y
        world.setPosition(reticleEid, hitPos.x, currentY + 0.01, hitPos.z)
      })

    defineState('placed')
      .onEvent(OBJECT_REMOVED_EVENT, 'placing', {target: world.events.globalId})
      .onEnter(() => {
        placed = false
        if (reticleEid !== null) {
          world.getEntity(reticleEid).show()
        }
      })
  }
})

export {
  OBJECT_PLACED_EVENT,
  OBJECT_REMOVED_EVENT,
}
