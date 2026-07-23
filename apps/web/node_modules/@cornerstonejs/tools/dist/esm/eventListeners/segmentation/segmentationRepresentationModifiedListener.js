import { triggerSegmentationRender } from '../../stateManagement/segmentation/SegmentationRenderingEngine';
const segmentationRepresentationModifiedListener = function (evt) {
    const { viewportId } = evt.detail;
    triggerSegmentationRender(viewportId);
};
export default segmentationRepresentationModifiedListener;
