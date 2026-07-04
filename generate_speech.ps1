Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("C:\Clinic_MVP\dental-crm\test_speech.wav")
$synth.Speak("Пациент жалуется на острую боль в нижнем левом зубе три шесть при накусывании. Сделаем снимок.")
$synth.Dispose()
