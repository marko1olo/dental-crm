import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import type { VOIRange } from '../types/voi';
export default function createLinearRGBTransferFunction(voiRange: VOIRange): vtkColorTransferFunction;
