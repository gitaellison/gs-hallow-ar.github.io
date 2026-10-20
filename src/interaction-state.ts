import type * as ecs from '@8thwall/ecs'

// Which creature the user most recently grabbed. Dragging sets it; pinch and
// twist only apply to that creature so multi-creature scenes don't all react.
let activeEid: ecs.Eid | null = null

export const setActiveCreature = (eid: ecs.Eid) => {
  activeEid = eid
}

export const isActiveCreature = (eid: ecs.Eid): boolean => activeEid === eid

export const clearActiveCreature = () => {
  activeEid = null
}
