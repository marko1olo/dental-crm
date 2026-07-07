import { triggerAnnotationModified } from '../stateManagement/annotation/helpers/state';
import { ChangeTypes } from '../enums';
export default function setAnnotationLabel(annotation, element, updatedLabel) {
    annotation.data.label = updatedLabel;
    triggerAnnotationModified(annotation, element, ChangeTypes.LabelChange);
}
