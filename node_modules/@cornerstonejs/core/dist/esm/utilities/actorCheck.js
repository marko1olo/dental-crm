export function isImageActor(actorEntry) {
    return (actorIsA(actorEntry, 'vtkVolume') || actorIsA(actorEntry, 'vtkImageSlice'));
}
export function actorIsA(actorEntry, actorType) {
    const actorToCheck = 'isA' in actorEntry ? actorEntry : actorEntry.actor;
    if (!actorToCheck) {
        return false;
    }
    return !!actorToCheck.isA(actorType);
}
