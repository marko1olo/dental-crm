import * as contourSegUtils from '../../utilities/contourSegmentation';
import { contourSegmentationRemoved } from './contourSegmentation';
export default function annotationRemovedListener(evt) {
    const annotation = evt.detail.annotation;
    if (contourSegUtils.isContourSegmentationAnnotation(annotation)) {
        contourSegmentationRemoved(evt);
    }
}
