import * as ecs from '@8thwall/ecs'
import {Logo} from './logo'
import {DragToMove} from './drag-to-move'
import {PinchToScale} from './pinch-to-scale'
import {TwistToRotate} from './twist-to-rotate'
import {getSelectedCreature, isPlaced, markPlaced, setPlacedEid, getPlacedEid} from './creature-picker'
import {viewPlanePoint} from './view-plane'

const OBJECT_PLACED_EVENT = 'object-placed'
const OBJECT_REMOVED_EVENT = 'object-removed'

ecs.registerComponent({
  name: 'tap-to-place',
  stateMachine: ({world, eid, defineState}) => {
    // Fallback drag: if the selected creature is already placed, dragging on
    // the ground moves it. Guarantees every creature is movable even when its
    // own mesh doesn't register touch hits (e.g. the flat Halloween sign).
    let groundPointerId: number | null = null
    let groundDragEid: ecs.Eid | null = null
    let groundOffset = ecs.math.vec3.zero()

    const stopGroundDrag = () => {
      groundPointerId = null
      groundDragEid = null
    }

    const startGroundDrag = (placedEid: ecs.Eid, screenPos: {x: number; y: number}) => {
      groundDragEid = placedEid
      const grab = viewPlanePoint(world, placedEid, screenPos)
      if (grab === null) {
        groundOffset = ecs.math.vec3.zero()
        return
      }
      const objPos = world.transform.getWorldPosition(placedEid)
      groundOffset = ecs.math.vec3.xyz(
        objPos.x - grab.x,
        objPos.y - grab.y,
        objPos.z - grab.z
      )
    }

    defineState('idle')
      .initial()
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (!e.data.worldPosition) {
          return
        }

        const creature = getSelectedCreature()

        if (isPlaced(creature.url)) {
          const placedEid = getPlacedEid(creature.url)
          if (placedEid !== null && world.eidToEntity.has(placedEid)) {
            groundPointerId = e.data.pointerId
            startGroundDrag(placedEid, e.data.position)
          }
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

        ecs.PositionAnimation.set(world, model, {
          duration: 2000,
          loop: false,
          fromY: -2,
          toY: 0,
          easeOut: true,
          easingFunction: 'Elastic',
        })

        const pos = e.data.worldPosition
        world.setPosition(root, pos.x, pos.y, pos.z)

        // Models render upright as-is; the only rotation is a world-Y yaw toward
        // the camera, plus per-creature tuning (all zero by default).
        const camPos = world.transform.getWorldPosition(world.camera.getActiveEid())
        const faceYaw =
          Math.atan2(camPos.x - pos.x, camPos.z - pos.z) +
          (creature.yawOffset * Math.PI) / 180 +
          (creature.flip ? Math.PI : 0)
        const rootQuat = ecs.math.quat.yRadians(faceYaw)
        world.setQuaternion(root, rootQuat.x, rootQuat.y, rootQuat.z, rootQuat.w)
        world.setScale(model, creature.scale, creature.scale, creature.scale)

        setPlacedEid(creature.url, model)

        world.events.dispatch(world.events.globalId, OBJECT_PLACED_EVENT)
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        if (groundPointerId === null || groundDragEid === null) return
        if (e.data.pointerId !== groundPointerId) return
        if (!world.eidToEntity.has(groundDragEid)) {
          stopGroundDrag()
          return
        }

        const grab = viewPlanePoint(world, groundDragEid, e.data.position)
        if (grab === null) return

        world.transform.setWorldPosition(
          groundDragEid,
          ecs.math.vec3.xyz(
            grab.x + groundOffset.x,
            grab.y + groundOffset.y,
            grab.z + groundOffset.z
          )
        )
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_END, (e) => {
        if (e.data.pointerId === groundPointerId) {
          stopGroundDrag()
        }
      })
  },
})

export {
  OBJECT_PLACED_EVENT,
  OBJECT_REMOVED_EVENT,
}
