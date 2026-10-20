import * as ecs from '@8thwall/ecs'

// Marker component: any entity with this is hidden during photo capture so UI
// prompts don't appear in the saved image.
const CaptureHide = ecs.registerComponent({name: 'capture-hide'})

export {CaptureHide}
