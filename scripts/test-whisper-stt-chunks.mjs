import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";

const textToSpeak = "Здравствуйте! Меня зовут Анна. Я пациент вашей клиники. Вчера вечером у меня начала болеть правая нижняя челюсть, кажется, это зуб мудрости. Боль очень резкая и отдаёт в ухо.";

function generateWav(filename, rate) {
  const psScript = `
    Add-Type -AssemblyName System.Speech;
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $synth.Rate = ${rate};
    $synth.SetOutputToWaveFile("${filename}");
    $synth.Speak("${textToSpeak}");
    $synth.Dispose();
  `;
  writeFileSync("temp_tts.ps1", psScript);
  execSync(`powershell -ExecutionPolicy Bypass -File temp_tts.ps1`, { stdio: 'inherit' });
  console.log(`Generated ${filename} with rate ${rate}`);
}

function sliceWav(buffer, durationSec, sliceLengthSec) {
  const header = buffer.subarray(0, 44);
  const data = buffer.subarray(44);
  
  const bytesPerSec = data.length / durationSec;
  const sliceBytes = Math.floor(bytesPerSec * sliceLengthSec);
  
  const chunks = [];
  for (let i = 0; i < data.length; i += sliceBytes) {
    const chunkData = data.subarray(i, i + sliceBytes);
    const chunkBuffer = Buffer.alloc(44 + chunkData.length);
    header.copy(chunkBuffer, 0);
    chunkData.copy(chunkBuffer, 44);
    
    chunkBuffer.writeUInt32LE(36 + chunkData.length, 4); 
    chunkBuffer.writeUInt32LE(chunkData.length, 40); 
    
    chunks.push(chunkBuffer);
  }
  return chunks;
}

async function testGroqSTT(buffer) {
  if (!process.env.GROQ_API_KEY) {
    return "[ERROR] GROQ_API_KEY не установлен. Укажите его для реального теста.";
  }
  
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'audio/wav' });
  formData.append('file', blob, 'chunk.wav');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'ru');
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: formData
    });
    
    if (!res.ok) {
      const txt = await res.text();
      return `[ERROR] STT Failed: ${txt}`;
    }
    
    const data = await res.json();
    return data.text;
  } catch (err) {
    return `[ERROR] Fetch Failed: ${err.message}`;
  }
}

async function run() {
  console.log("=== Генерация тестовых аудио ===");
  generateWav("test_normal.wav", 0);
  
  const normalBuf = readFileSync("test_normal.wav");
  const chunks = sliceWav(normalBuf, 11, 3); 
  
  console.log("=== Тестирование распознавания слепых чанков (по 3 сек) ===");
  for (let i = 0; i < chunks.length; i++) {
    writeFileSync(`chunk_${i}.wav`, chunks[i]);
    console.log(`Отправляем чанк ${i} в Whisper...`);
    const result = await testGroqSTT(chunks[i]);
    console.log(`Результат чанка ${i}: ${result}`);
  }
  
  console.log("\n=== Тестирование распознавания целого файла (VAD) ===");
  console.log(`Отправляем целый файл в Whisper...`);
  const fullResult = await testGroqSTT(normalBuf);
  console.log(`Результат целого файла: ${fullResult}`);
  
  console.log("\nЕсли вместо результата была ошибка GROQ_API_KEY, пожалуйста, перезапустите скрипт, передав ключ.");
}

run().catch(console.error);
