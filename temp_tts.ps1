
    Add-Type -AssemblyName System.Speech;
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $synth.Rate = 0;
    $synth.SetOutputToWaveFile("test_normal.wav");
    $synth.Speak("Здравствуйте! Меня зовут Анна. Я пациент вашей клиники. Вчера вечером у меня начала болеть правая нижняя челюсть, кажется, это зуб мудрости. Боль очень резкая и отдаёт в ухо.");
    $synth.Dispose();
  