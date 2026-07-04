Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices()
$ruVoice = $voices | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ru-RU' } | Select-Object -First 1

if ($ruVoice) {
    $synth.SelectVoice($ruVoice.VoiceInfo.Name)
} else {
    Write-Host "No RU voice found, using default."
}

$synth.SetOutputToWaveFile("C:\Clinic_MVP\dental-crm\test_dictation.wav")
$synth.Speak("Жалобы на острую боль в зубе три шесть от холодного. Объективно кариозная полость. Зондирование болезненно. Диагноз пульпит тридцать шестого. Проведена анестезия, коффердам, эндодонтия. Поставлена пломба филтек.")
$synth.Dispose()
Write-Host "Audio generated."
