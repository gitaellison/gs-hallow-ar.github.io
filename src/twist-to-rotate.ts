import * as ecs from '@8thwall/ecs'
import {isActiveCreature} from './interaction-state'

const TwistToRotate = ecs.registerComponent({
  name: 'twist-to-rotate',
  stateMachine: ({world, eid, defineState}) => {
    const pointers = new Map<number, {x: number; y: number}>()
    let lastAngle: number | null = null

    const detach = () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
    }

    const stillAlive = () => {
      if (!world.eidToEntity.has(eid)) {
        detach()
        return false
      }
      return true
    }

    const currentAngle = () => {
      if (pointers.size !== 2) return null
      const [a, b] = Array.from(pointers.values())
      return Math.atan2(b.y - a.y, b.x - a.x)
    }

    function onPointerDown(evt: PointerEvent) {
      if (!stillAlive()) return
      pointers.set(evt.pointerId, {x: evt.clientX, y: evt.clientY})
      lastAngle = currentAngle()
    }

    function onPointerMove(evt: PointerEvent) {
      if (!stillAlive() || !isActiveCreature(eid)) return
      if (!pointers.has(evt.pointerId)) return
      pointers.set(evt.pointerId, {x: evt.clientX, y: evt.clientY})

      const angle = currentAngle()
      if (angle === null) {
        lastAngle = null
        return
      }
      if (lastAngle === null) {
        lastAngle = angle
        return
      }

      let delta = angle - lastAngle
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      lastAngle = angle

      if (Math.abs(delta) < 1e-4) return

      const currentQuat = world.transform.getWorldQuaternion(eid)
      const twist = ecs.math.quat.yRadians(-delta)
      world.transform.setWorldQuaternion(eid, twist.times(currentQuat))
    }

    function onPointerUp(evt: PointerEvent) {
      if (!stillAlive()) return
      pointers.delete(evt.pointerId)
      lastAngle = currentAngle()
    }

    defineState('idle').initial().onEnter(() => {
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerUp)
    })
  },
})



export {TwistToRotate}
