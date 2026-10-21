import * as ecs from '@8thwall/ecs'
import {setActiveCreature} from './interaction-state'

const DragToMove = ecs.registerComponent({
  name: 'drag-to-move',
  stateMachine: ({world, eid, defineState}) => {
    let activePointerId: number | null = null
    let grabOffset = ecs.math.vec3.zero()

    const worldPosToViewPlane = (position: {x: number; y: number}, camera: any) => {
      const THREE = (window as any).THREE
      if (!THREE) return null

      const objPos = world.transform.getWorldPosition(eid)
      const objVec = new THREE.Vector3(objPos.x, objPos.y, objPos.z)

      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(position.x * 2 - 1, position.y * -2 + 1), camera)

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(fwd, objVec)
      const hit = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      return ecs.math.vec3.xyz(hit.x, hit.y, hit.z)
    }

    defineState('idle').initial()
      .onEnter(() => {
        activePointerId = null
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        const camera = world.three.activeCamera
        const THREE = (window as any).THREE
        if (activePointerId !== null || !e.data.worldPosition || !camera || !THREE) return
        activePointerId = e.data.pointerId
        setActiveCreature(eid)

        const objPos = world.transform.getWorldPosition(eid)
        const grabPoint = worldPosToViewPlane(e.data.position, camera)
        if (grabPoint === null) {
          grabOffset = ecs.math.vec3.zero()
          return
        }
        grabOffset = ecs.math.vec3.xyz(objPos.x - grabPoint.x, objPos.y - grabPoint.y, objPos.z - grabPoint.z)
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        const camera = world.three.activeCamera
        if (activePointerId === null || e.data.pointerId !== activePointerId || !camera) return

        const grabPoint = worldPosToViewPlane(e.data.position, camera)
        if (grabPoint === null) return

        world.transform.setWorldPosition(
          eid,
          ecs.math.vec3.xyz(
            grabPoint.x + grabOffset.x,
            grabPoint.y + grabOffset.y,
            grabPoint.z + grabOffset.z
          )
        )
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_END, (e) => {
        if (e.data.pointerId === activePointerId) {
          activePointerId = null
        }
      })
  },
})

export {DragToMove}
