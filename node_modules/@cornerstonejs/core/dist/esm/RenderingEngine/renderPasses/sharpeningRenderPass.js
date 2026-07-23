import vtkConvolution2DPass from '@kitware/vtk.js/Rendering/OpenGL/Convolution2DPass';
import vtkForwardPass from '@kitware/vtk.js/Rendering/OpenGL/ForwardPass';
function createSharpeningRenderPass(intensity) {
    let renderPass = vtkForwardPass.newInstance();
    if (intensity > 0) {
        const convolutionPass = vtkConvolution2DPass.newInstance();
        convolutionPass.setDelegates([renderPass]);
        const k = Math.max(0, intensity);
        convolutionPass.setKernelDimension(3);
        convolutionPass.setKernel([-k, -k, -k, -k, 1 + 8 * k, -k, -k, -k, -k]);
        renderPass = convolutionPass;
    }
    return renderPass;
}
export { createSharpeningRenderPass };
