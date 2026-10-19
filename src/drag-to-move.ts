import * as ecs from '@8thwall/ecs'

const DRAG_PLANE_Y = 0

const DragToMove = ecs.registerComponent({
  name: 'drag-to-move',
  stateMachine: ({world, eid, defineState}) => {
    let activePointerId: number | null = null
    let grabOffset = ecs.math.vec3.zero()

    const screenPointOnGroundPlane = (position: {x: number; y: number}) => {
      const THREE = (window as any).THREE
      const camera = world.three.activeCamera
      if (!THREE || !camera) return null

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(position.x * 2 - 1, position.y * -2 + 1), camera)
      const ray = raycaster.ray

      const origin = ray.origin
      const direction = ray.direction
      if (Math.abs(direction.y) < 1e-6) return null

      const t = (DRAG_PLANE_Y - origin.y) / direction.y
      if (t <= 0) return null

      return ecs.math.vec3.xyz(origin.x + direction.x * t, DRAG_PLANE_Y, origin.z + direction.z * t)
    }

    defineState('idle').initial()
      .onEnter(() => {
        activePointerId = null
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (activePointerId !== null || !e.data.worldPosition) return

        const grabPoint = screenPointOnGroundPlane(e.data.position)
        if (grabPoint === null) return

        const skeletonPos = ecs.math.vec3.zero()
        world.transform.getWorldPosition(eid, skeletonPos)
        grabOffset = ecs.math.vec3.xyz(
          skeletonPos.x - grabPoint.x,
          0,
          skeletonPos.z - grabPoint.z
        )
        activePointerId = e.data.pointerId
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        if (activePointerId === null || e.data.pointerId !== activePointerId) return

        const grabPoint = screenPointOnGroundPlane(e.data.position)
        if (grabPoint === null) return

        const skeletonPos = ecs.math.vec3.zero()
        world.transform.getWorldPosition(eid, skeletonPos)
        world.transform.setWorldPosition(
          eid,
          ecs.math.vec3.xyz(
            grabPoint.x + grabOffset.x,
            skeletonPos.y,
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
