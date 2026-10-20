import * as ecs from '@8thwall/ecs'

const DragToMove = ecs.registerComponent({
  name: 'drag-to-move',
  stateMachine: ({world, eid, defineState}) => {
    let activePointerId: number | null = null

    // Camera-relative horizontal drag: map normalized screen deltas onto the
    // camera's right / forward axes projected on the floor plane. This tracks
    // naturally for every viewing pitch (screen up/down = depth), instead of
    // ray-vs-ground-plane which degenerates when holding the phone level.
    const moveByScreenDelta = (change: {x: number; y: number}) => {
      const THREE = (window as any).THREE
      const camera = world.three.activeCamera
      if (!THREE || !camera) return

      const objPos = world.transform.getWorldPosition(eid)
      const camV = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
      const dist = camV.distanceTo(new THREE.Vector3(objPos.x, objPos.y, objPos.z))

      const fovRad = ((camera.fov || 60) * Math.PI) / 180
      const scale = 2 * Math.max(0.3, dist) * Math.tan(fovRad / 2)

      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      fwd.y = 0
      if (fwd.lengthSq() < 1e-8) return
      fwd.normalize()
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0))

      const moveX = right.x * change.x * scale + fwd.x * -change.y * scale
      const moveZ = right.z * change.x * scale + fwd.z * -change.y * scale

      world.transform.setWorldPosition(
        eid,
        ecs.math.vec3.xyz(objPos.x + moveX, objPos.y, objPos.z + moveZ)
      )
    }

    defineState('idle').initial()
      .onEnter(() => {
        activePointerId = null
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (activePointerId !== null || !e.data.worldPosition) return
        activePointerId = e.data.pointerId
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        if (activePointerId === null || e.data.pointerId !== activePointerId) return
        if (!e.data.change) return
        moveByScreenDelta(e.data.change)
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_END, (e) => {
        if (e.data.pointerId === activePointerId) {
          activePointerId = null
        }
      })
  },
})

export {DragToMove}
