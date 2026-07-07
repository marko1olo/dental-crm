function isModalityLUTForDisplay(sopClassUid) {
    return (sopClassUid !== '1.2.840.10008.5.1.4.1.1.12.1' &&
        sopClassUid !== '1.2.840.10008.5.1.4.1.1.12.2.1');
}
export default isModalityLUTForDisplay;
