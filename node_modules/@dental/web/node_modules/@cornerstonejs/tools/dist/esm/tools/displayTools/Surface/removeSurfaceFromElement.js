import { getEnabledElement } from '@cornerstonejs/core';
function removeSurfaceFromElement(element, segmentationId) {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement;
    const actorEntries = viewport.getActors();
    const filteredSurfaceActors = actorEntries.filter((actor) => actor.representationUID &&
        typeof actor.representationUID === 'string' &&
        actor.representationUID.startsWith(segmentationId));
    viewport.removeActors(filteredSurfaceActors.map((actor) => actor.uid));
}
export default removeSurfaceFromElement;
