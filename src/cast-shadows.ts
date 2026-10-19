import * as ecs from '@8thwall/ecs'

const CastShadows = ecs.registerComponent({
  name: 'cast-shadows',
  stateMachine: ({world, eid, defineState}) => {
    const apply = (root: any) => {
      if (!root) return
      const stack = [root]
      while (stack.length > 0) {
        const obj = stack.pop()
        if (obj.isMesh) {
          obj.castShadow = true
        }
        if (obj.children) {
          for (const child of obj.children) {
            stack.push(child)
          }
        }
      }
      if (world.three.notifyChanged) {
        world.three.notifyChanged(root)
      }
    }

    defineState('idle').initial().listen(eid, ecs.events.GLTF_MODEL_LOADED, (e) => {
      apply((e.data as any).model)
    })
  },
})

export {CastShadows}
