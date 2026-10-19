import * as ecs from '@8thwall/ecs'

const DragToMove = ecs.registerComponent({
  name: 'drag-to-move',
  stateMachine: ({world, eid, defineState}) => {
    let activePointerId: number | null = null
    let grabOffset = ecs.math.vec3.zero()

    const screenPointOnPlane = (position: {x: number; y: number}, planeY: number) => {
      const THREE = (window as any).THREE
      const camera = world.three.activeCamera
      if (!THREE || !camera) return null

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(position.x * 2 - 1, position.y * -2 + 1), camera)
      const ray = raycaster.ray

      const origin = ray.origin
      const direction = ray.direction
      if (Math.abs(direction.y) < 1e-6) return null

      const t = (planeY - origin.y) / direction.y
      if (t <= 0) return null

      return ecs.math.vec3.xyz(origin.x + direction.x * t, planeY, origin.z + direction.z * t)
    }

    defineState('idle').initial()
      .onEnter(() => {
        activePointerId = null
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (activePointerId !== null || !e.data.worldPosition) return

        const startPos = world.transform.getWorldPosition(eid)
        const grabPoint = screenPointOnPlane(e.data.position, startPos.y)
        if (grabPoint === null) return

        grabOffset = ecs.math.vec3.xyz(
          startPos.x - grabPoint.x,
          0,
          startPos.z - grabPoint.z
        )
        activePointerId = e.data.pointerId
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        if (activePointerId === null || e.data.pointerId !== activePointerId) return

        const skeletonPos = world.transform.getWorldPosition(eid)
        const grabPoint = screenPointOnPlane(e.data.position, skeletonPos.y)
        if (grabPoint === null) return

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
