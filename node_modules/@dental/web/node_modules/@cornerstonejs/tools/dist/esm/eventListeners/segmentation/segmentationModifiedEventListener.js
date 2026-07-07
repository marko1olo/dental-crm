import { triggerSegmentationRenderBySegmentationId } from '../../stateManagement/segmentation/SegmentationRenderingEngine';
const segmentationModifiedListener = function (evt) {
    const { segmentationId } = evt.detail;
    triggerSegmentationRenderBySegmentationId(segmentationId);
};
export default segmentationModifiedListener;
