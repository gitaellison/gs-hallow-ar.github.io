import * as ecs from '@8thwall/ecs'
import {Logo} from './logo'
import {DragToMove} from './drag-to-move'
import {PinchToScale} from './pinch-to-scale'
import {TwistToRotate} from './twist-to-rotate'
import {getSelectedCreature, isPlaced, markPlaced} from './creature-picker'

const OBJECT_PLACED_EVENT = 'object-placed'
const OBJECT_REMOVED_EVENT = 'object-removed'

ecs.registerComponent({
  name: 'tap-to-place',
  stateMachine: ({world, eid, defineState}) => {
    defineState('idle').initial().listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
      if (!e.data.worldPosition) {
        return
      }

      const creature = getSelectedCreature()
      if (isPlaced(creature.url)) {
        return
      }
      markPlaced(creature.url)
      const root = world.createEntity()
      world.getEntity(root).set(Logo, {})

      const model = world.createEntity()
      const modelEntity = world.getEntity(model)
      modelEntity.setParent(root)
      modelEntity.set(ecs.Shadow, {castShadow: true, receiveShadow: false})
      modelEntity.set(ecs.GltfModel, {url: creature.url, animationClip: '', loop: true})
      modelEntity.set(DragToMove, {})
      modelEntity.set(PinchToScale, {})
      modelEntity.set(TwistToRotate, {})

      const pos = e.data.worldPosition
      world.setPosition(root, pos.x, pos.y, pos.z)

      ecs.PositionAnimation.set(world, root, {
        duration: 2000,
        loop: false,
        fromX: pos.x,
        fromY: pos.y - 2,
        fromZ: pos.z,
        toX: pos.x,
        toY: pos.y,
        toZ: pos.z,
        easeOut: true,
        easingFunction: 'Elastic',
      })

      const camPos = world.transform.getWorldPosition(world.camera.getActiveEid())
      const faceYaw = Math.atan2(camPos.x - pos.x, camPos.z - pos.z) + (creature.flip ? Math.PI : 0)
      const rootQuat = ecs.math.quat.pitchYawRollRadians(
        ecs.math.vec3.xyz(
          (creature.fixX * Math.PI) / 180,
          faceYaw,
          (creature.fixZ * Math.PI) / 180
        )
      )
      world.setQuaternion(root, rootQuat.x, rootQuat.y, rootQuat.z, rootQuat.w)
      world.setScale(model, creature.scale, creature.scale, creature.scale)

      world.events.dispatch(world.events.globalId, OBJECT_PLACED_EVENT)
    })
  },
})

export {
  OBJECT_PLACED_EVENT,
  OBJECT_REMOVED_EVENT,
}
