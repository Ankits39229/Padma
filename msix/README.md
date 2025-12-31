# MSIX Package for Padma (Microsoft Store)

## Store Identity
- **Package Name**: Nemi.Padma
- **Publisher**: CN=02E48616-E203-4166-A48A-4838D29554D6
- **Publisher Display Name**: Nemi Inc
- **Store ID**: 9NGNHV7G4D6Q

## Required Assets (place in `assets` folder)

| File | Size | Required |
|------|------|----------|
| StoreLogo.png | 50x50 | Yes |
| Square44x44Logo.png | 44x44 | Yes |
| Square71x71Logo.png | 71x71 | Yes |
| Square150x150Logo.png | 150x150 | Yes |
| Square310x310Logo.png | 310x310 | Optional |
| Wide310x150Logo.png | 310x150 | Yes |
| SplashScreen.png | 620x300 | Optional |

## Folder Structure
```
msix/
├── AppxManifest.xml
├── Padma.exe (your built app)
├── [other app files]
└── assets/
    ├── StoreLogo.png
    ├── Square44x44Logo.png
    ├── Square71x71Logo.png
    ├── Square150x150Logo.png
    ├── Wide310x150Logo.png
    └── SplashScreen.png
```

## Build Commands

### 1. Create MSIX Package
```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" pack /d "msix" /p "Padma.msix" /o
```

### 2. For Store Submission
No signing required - Microsoft Store signs the package automatically.

### 3. For Local Testing (self-signed)
```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f YourCert.pfx /p YourPassword /fd SHA256 Padma.msix
```

### 4. Install Locally
```powershell
Add-AppxPackage -Path "Padma.msix"
```
