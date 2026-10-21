import * as ecs from '@8thwall/ecs'

// Project a normalized screen position onto the plane through the entity's
// world position that is perpendicular to the camera view direction.
export const viewPlanePoint = (
  world: ecs.World,
  eid: ecs.Eid,
  position: {x: number; y: number}
) => {
  const THREE = (window as any).THREE
  const camera = world.three.activeCamera
  if (!THREE || !camera) return null

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
