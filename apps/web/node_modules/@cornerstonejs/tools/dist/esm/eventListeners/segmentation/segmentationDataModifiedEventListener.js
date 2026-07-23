import { triggerSegmentationRenderBySegmentationId } from '../../stateManagement/segmentation/SegmentationRenderingEngine';
import onLabelmapSegmentationDataModified from './labelmap/onLabelmapSegmentationDataModified';
import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
const onSegmentationDataModified = function (evt) {
    const { segmentationId } = evt.detail;
    const { representationData } = getSegmentation(segmentationId);
    if (representationData.Labelmap) {
        onLabelmapSegmentationDataModified(evt);
    }
    triggerSegmentationRenderBySegmentationId(segmentationId);
};
export default onSegmentationDataModified;
