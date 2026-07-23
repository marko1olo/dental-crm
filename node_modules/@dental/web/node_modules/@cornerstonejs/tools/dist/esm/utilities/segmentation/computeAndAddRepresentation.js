import addRepresentationData from '../../stateManagement/segmentation/internalAddRepresentationData';
async function computeAndAddRepresentation(segmentationId, type, computeFunction, onComputationComplete) {
    const data = await computeFunction();
    addRepresentationData({
        segmentationId,
        type,
        data,
    });
    onComputationComplete?.();
    return data;
}
export { computeAndAddRepresentation };
