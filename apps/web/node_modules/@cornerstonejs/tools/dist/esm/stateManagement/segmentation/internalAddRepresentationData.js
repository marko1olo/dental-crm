import { getSegmentation } from './getSegmentation';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
function internalAddRepresentationData({ segmentationId, type, data, }) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`Segmentation ${segmentationId} not found`);
    }
    if (segmentation.representationData[type]) {
        console.warn(`Representation data of type ${type} already exists for segmentation ${segmentationId}, overwriting it.`);
    }
    switch (type) {
        case SegmentationRepresentations.Labelmap:
            if (data) {
                segmentation.representationData[type] =
                    data;
            }
            break;
        case SegmentationRepresentations.Contour:
            if (data) {
                segmentation.representationData[type] = data;
            }
            break;
        case SegmentationRepresentations.Surface:
            if (data) {
                segmentation.representationData[type] = data;
            }
            break;
        default:
            throw new Error(`Invalid representation type ${type}`);
    }
}
export default internalAddRepresentationData;
