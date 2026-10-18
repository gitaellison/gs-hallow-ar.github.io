import * as ecs from '@8thwall/ecs'
import { Logo } from './logo'

const logoQuery = ecs.defineQuery([Logo])

ecs.registerComponent({
  name: 'drag-to-move',
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    let isDragging = false
    let dragOffset = ecs.math.vec3.zero()
    let activePointerId: number | null = null

    defineState('idle').initial()
      .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
        if (activePointerId !== null || !e.data.target || !e.data.worldPosition) return
        
        const skeletons = logoQuery(world)
        if (skeletons.length === 0) return
        
        const targetSkeleton = skeletons.find(s => s === e.data.target)
        if (!targetSkeleton) return
        
        isDragging = true
        activePointerId = e.data.pointerId
        
        const skeletonPos = ecs.math.vec3.zero()
        world.transform.getLocalPosition(targetSkeleton, skeletonPos)
        dragOffset = skeletonPos.minus(e.data.worldPosition)
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_MOVE, (e) => {
        if (!isDragging || activePointerId === null || e.data.pointerId !== activePointerId) return
        
        const skeletons = logoQuery(world)
        if (skeletons.length === 0) return
        
        const activeCameraEid = world.camera.getActiveEid()
        const results = world.raycastFrom(activeCameraEid)
        if (results.length === 0) return
        
        const hitPoint = results[0].point
        const newPos = hitPoint.plus(dragOffset)
        const targetSkeleton = skeletons[0]
        world.setPosition(targetSkeleton, newPos.x, newPos.y, newPos.z)
      })
      .listen(eid, ecs.input.SCREEN_TOUCH_END, (e) => {
        if (e.data.pointerId === activePointerId) {
          isDragging = false
          activePointerId = null
        }
      })
  }
})

export {}
