export function applyDecimatedVolumeModifiers(baseProps, modifiers, context) {
    return modifiers.reduce((currentProps, modifier) => modifier.apply(currentProps, context), baseProps);
}
