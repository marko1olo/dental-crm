; =============================================================================
; DENTE Dental CRM — Inno Setup 6 Script for Local Windows Distribution
; Target: Solo Doctor & Small Clinic (1-3 Chairs) Local Infrastructure
; =============================================================================

#define MyAppName "DENTE Dental CRM"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "DENTE Medical Systems"
#define MyAppURL "https://dente.clinic"
#define MyAppExeName "DenteService.exe"
#define AppGuid "{{A5F2D981-6C04-4F2A-98C3-DENTE0000001}}"

[Setup]
AppId={#AppGuid}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\DenteCRM
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\..\dist\installer
OutputBaseFilename=DenteSetup
UninstallDisplayIcon={app}\bin\icons\dente.svg
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=force
RestartApplications=no
DisableWelcomePage=no

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
; Base application installation directories
Name: "{app}\bin"
Name: "{app}\bin\node"
Name: "{app}\bin\postgres"
Name: "{app}\bin\postgres\bin"
Name: "{app}\bin\winsw"
Name: "{app}\bin\icons"
Name: "{app}\server"
Name: "{app}\server\dist"
Name: "{app}\web"
Name: "{app}\scripts"

; Persistent ProgramData directory structure (Clinical data & logs)
Name: "{commonappdata}\DenteCRM"
Name: "{commonappdata}\DenteCRM\data"
Name: "{commonappdata}\DenteCRM\data\pg18"
Name: "{commonappdata}\DenteCRM\data\storage"
Name: "{commonappdata}\DenteCRM\data\storage\documents"
Name: "{commonappdata}\DenteCRM\data\storage\attachments"
Name: "{commonappdata}\DenteCRM\data\backups"
Name: "{commonappdata}\DenteCRM\logs"

[Files]
; Windows Service wrapper configuration and binary
Source: "DenteService.xml"; DestDir: "{app}\bin\winsw"; Flags: ignoreversion
Source: "bin\winsw\WinSW-x64.exe"; DestDir: "{app}\bin\winsw"; DestName: "DenteService.exe"; Flags: ignoreversion skipifsourcedoesntexist

; Portable Node.js LTS runtime
Source: "bin\node\*"; DestDir: "{app}\bin\node"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Portable PostgreSQL 18 database engine binaries
Source: "bin\postgres\*"; DestDir: "{app}\bin\postgres"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Compiled Fastify API backend and shared package
Source: "..\..\apps\api\dist\*"; DestDir: "{app}\server\dist"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\..\apps\api\package.json"; DestDir: "{app}\server"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\..\packages\shared\dist\*"; DestDir: "{app}\packages\shared\dist"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\..\packages\shared\package.json"; DestDir: "{app}\packages\shared"; Flags: ignoreversion skipifsourcedoesntexist

; Compiled React 19 SPA frontend
Source: "..\..\apps\web\dist\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Operational scripts & Crash recovery engine
Source: "db-preflight.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "Setup-DenteLanNetwork.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "service-bootstrap.mjs"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "service-runner.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "open-dente.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "manage-service.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "DenteTray.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "DenteTray.vbs"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Visual identity assets
Source: "..\..\apps\web\public\icon.svg"; DestDir: "{app}\bin\icons"; DestName: "dente.svg"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
; Desktop shortcut for doctor / receptionist
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\scripts\open-dente.cmd"; WorkingDir: "{app}\scripts"; Comment: "Открыть рабочее место DENTE Dental CRM"

; Start menu shortcuts
Name: "{group}\{#MyAppName}"; Filename: "{app}\scripts\open-dente.cmd"; WorkingDir: "{app}\scripts"
Name: "{group}\Управление службой DENTE"; Filename: "{app}\scripts\manage-service.cmd"; WorkingDir: "{app}\scripts"
Name: "{group}\Журналы сервера (Logs)"; Filename: "{commonappdata}\DenteCRM\logs"
Name: "{group}\Папка данных и снимков"; Filename: "{commonappdata}\DenteCRM\data"
Name: "{group}\Удалить {#MyAppName}"; Filename: "{uninstallexe}"

; User startup tray monitor (silently started upon Windows logon)
Name: "{userstartup}\DENTE CRM Tray Monitor"; Filename: "{app}\scripts\DenteTray.vbs"; WorkingDir: "{app}\scripts"

[Run]
; 1. Configure clinic LAN network adapter (Public -> Private) and Defender Firewall
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\Setup-DenteLanNetwork.ps1"""; StatusMsg: "Настройка брандмауэра Windows и профиля локальной сети..."; Flags: runhidden

; 2. Execute DB preflight check (post-blackout lock recovery, 5432/5438 port check, cluster init)
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\db-preflight.ps1"" -DataDir ""{commonappdata}\DenteCRM\data\pg18"" -EnvFile ""{commonappdata}\DenteCRM\dente.env"" -StartPostgres"; StatusMsg: "Инициализация и предстартовая проверка PostgreSQL 18..."; Flags: runhidden

; 3. Register WinSW Windows Service
Filename: "{app}\bin\winsw\DenteService.exe"; Parameters: "install"; StatusMsg: "Регистрация службы DenteCRMService в Windows..."; Flags: runhidden

; 4. Start WinSW Windows Service
Filename: "{app}\bin\winsw\DenteService.exe"; Parameters: "start"; StatusMsg: "Запуск службы DenteCRMService..."; Flags: runhidden

; 5. Launch Tray Monitor
Filename: "{app}\scripts\DenteTray.vbs"; Description: "Запустить монитор DENTE в системном трее"; Flags: postinstall nowait runhidden

; 6. Open Web Application in default browser
Filename: "{app}\scripts\open-dente.cmd"; Description: "Открыть DENTE CRM в браузере"; Flags: postinstall nowait skipifsilent unchecked

[UninstallRun]
; 1. Stop Windows Service
Filename: "{app}\bin\winsw\DenteService.exe"; Parameters: "stop"; Flags: runhidden
; 2. Uninstall Windows Service
Filename: "{app}\bin\winsw\DenteService.exe"; Parameters: "uninstall"; Flags: runhidden
; 3. Terminate tray monitor
Filename: "taskkill.exe"; Parameters: "/F /IM powershell.exe /FI ""WINDOWTITLE eq DenteTray*"""; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // If service is running, attempt graceful stop before upgrade
  Exec('net.exe', 'stop DenteCRMService', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvPath: String;
  SecretKey: String;
  EncryptionKey: String;
  AdminSecret: String;
  EnvContent: String;
  TickStr: String;
begin
  if CurStep = ssPostInstall then
  begin
    EnvPath := ExpandConstant('{commonappdata}\DenteCRM\dente.env');
    if not FileExists(EnvPath) then
    begin
      TickStr := IntToStr(GetTickCount());
      SecretKey := 'sec_' + Copy(GetSHA256OfString(TickStr + '_auth_secret'), 1, 48);
      EncryptionKey := Copy(GetSHA256OfString(TickStr + '_enc_key'), 1, 32);
      AdminSecret := 'adm_' + Copy(GetSHA256OfString(TickStr + '_admin_secret'), 1, 32);

      EnvContent :=
        'NODE_ENV=production' + #13#10 +
        'API_HOST=0.0.0.0' + #13#10 +
        'PORT=4000' + #13#10 +
        'API_PORT=4000' + #13#10 +
        'WEB_ORIGIN=http://localhost:4000,http://127.0.0.1:4000' + #13#10 +
        'POSTGRES_USER=dental' + #13#10 +
        'POSTGRES_PASSWORD=dental' + #13#10 +
        'POSTGRES_DB=dental_crm' + #13#10 +
        'POSTGRES_PORT=5432' + #13#10 +
        'PGPORT=5432' + #13#10 +
        'DATABASE_URL=postgres://dental:dental@127.0.0.1:5432/dental_crm' + #13#10 +
        'AUTH_TOKEN_SECRET=' + SecretKey + #13#10 +
        'CLINIC_ENCRYPTION_KEY=' + EncryptionKey + #13#10 +
        'DENTE_SETTINGS_ADMIN_SECRET=' + AdminSecret + #13#10 +
        'DENTE_CLINICAL_ADMIN_SECRET=' + AdminSecret + #13#10 +
        'DENTE_SCHEDULE_ADMIN_SECRET=' + AdminSecret + #13#10 +
        'DENTE_WEBHOOK_SECRET=' + AdminSecret + #13#10 +
        'DENTE_DATA_DIR=' + ExpandConstant('{commonappdata}\DenteCRM\data') + #13#10 +
        'DOCUMENT_STORAGE_PATH=' + ExpandConstant('{commonappdata}\DenteCRM\data\storage\documents') + #13#10 +
        'ATTACHMENT_STORAGE_PATH=' + ExpandConstant('{commonappdata}\DenteCRM\data\storage\attachments') + #13#10;

      SaveStringToFile(EnvPath, EnvContent, False);
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataPath: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataPath := ExpandConstant('{commonappdata}\DenteCRM\data');
    if DirExists(DataPath) then
    begin
      // Protect patient clinical records and financial data from accidental deletion
      if MsgBox('Сохранить базу данных пациентов и снимки (ProgramData\DenteCRM\data)?' + #13#10 +
                'Выберите ДА, чтобы сохранить медицинские данные для последующего использования.',
                mbConfirmation, MB_YESNO) = IDNO then
      begin
        DelTree(ExpandConstant('{commonappdata}\DenteCRM'), True, True, True);
      end;
    end;
  end;
end;
