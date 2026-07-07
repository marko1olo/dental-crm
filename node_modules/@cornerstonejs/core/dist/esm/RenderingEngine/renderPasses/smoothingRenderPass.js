import vtkConvolution2DPass from '@kitware/vtk.js/Rendering/OpenGL/Convolution2DPass';
import vtkForwardPass from '@kitware/vtk.js/Rendering/OpenGL/ForwardPass';
function createSmoothingRenderPass(intensity) {
    let renderPass = vtkForwardPass.newInstance();
    if (intensity > 0) {
        const convolutionPass = vtkConvolution2DPass.newInstance();
        convolutionPass.setDelegates([renderPass]);
        const smoothStrength = Math.min(intensity, 1000);
        const kernelSize = 15;
        const sigma = 5.0;
        const gaussianKernel = createGaussianKernel(kernelSize, sigma);
        const totalElements = kernelSize * kernelSize;
        const centerIndex = Math.floor(totalElements / 2);
        const identityKernel = Array(totalElements).fill(0);
        identityKernel[centerIndex] = 1;
        const alpha = Math.min(smoothStrength / 10, 1.0);
        const kernel = gaussianKernel.map((g, i) => (1 - alpha) * identityKernel[i] + alpha * g);
        convolutionPass.setKernelDimension(15);
        convolutionPass.setKernel(kernel);
        renderPass = convolutionPass;
    }
    return renderPass;
}
function createGaussianKernel(size, sigma) {
    const kernel = [];
    const mean = (size - 1) / 2;
    let sum = 0;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - mean;
            const dy = y - mean;
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * Math.pow(sigma, 2)));
            kernel.push(value);
            sum += value;
        }
    }
    return kernel.map((v) => v / sum);
}
export { createSmoothingRenderPass };
