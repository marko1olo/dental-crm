import { removeContourSegmentationAnnotation } from '../../../utilities/contourSegmentation';
export default function contourSegmentationRemovedListener(evt) {
    const annotation = evt.detail.annotation;
    removeContourSegmentationAnnotation(annotation);
}
