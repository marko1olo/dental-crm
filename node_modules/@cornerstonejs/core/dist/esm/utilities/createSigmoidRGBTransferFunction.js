import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import * as windowLevelUtil from './windowLevel';
import { logit } from './logit';
export default function createSigmoidRGBTransferFunction(voiRange, approximationNodes = 1024) {
    const { windowWidth, windowCenter } = windowLevelUtil.toWindowLevel(voiRange.lower, voiRange.upper);
    const range = Array.from({ length: approximationNodes }, (_, i) => (i + 1) / (approximationNodes + 2));
    const table = range.flatMap((y) => {
        const x = logit(y, windowCenter, windowWidth);
        return [x, y, y, y, 0.5, 0.0];
    });
    const cfun = vtkColorTransferFunction.newInstance();
    cfun.buildFunctionFromArray(vtkDataArray.newInstance({
        values: table,
        numberOfComponents: 6,
    }));
    return cfun;
}
