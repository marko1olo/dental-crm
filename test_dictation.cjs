const fs = require('fs');

async function test() {
    const audio = fs.readFileSync('C:/Clinic_MVP/dental-crm/test_dictation.wav');
    const base64 = audio.toString('base64');
    
    const input = {
        recordingId: "test_script_1",
        chunkIndex: 0,
        mimeType: "audio/wav",
        audioBase64: base64,
        durationMs: 8000,
        language: "ru",
        source: "visit",
        patientId: "test_patient",
        visitId: "test_visit",
        specialty: "universal",
        clientRecordedAt: new Date().toISOString()
    };
    
    console.log('Sending request to API...');
    try {
        const res = await fetch('http://127.0.0.1:4100/api/speech/transcribe-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify(input)
        });
        
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch(err) {
        console.error('Error:', err);
    }
}

test();
