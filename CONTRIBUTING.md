# Contributing to Hangly for Windows

Thank you for your interest in contributing to Hangly for Windows!

## Getting Started

1. Clone the repository:
   ```cmd
   git clone https://github.com/Prasanna-M2/Hangy-.git
   cd Hangy-
   ```
2. Build the native Windows overlay:
   ```cmd
   build.bat
   ```
3. Run the application:
   ```cmd
   Hangly.exe
   ```
4. Run the Web Studio:
   ```cmd
   npm install
   npm start
   ```

## Development Guidelines

- **Windows Native First**: The core desktop overlay is written in C# targeting .NET Framework 4.0 (`src/HanglyApp.cs`) using Windows Forms and GDI+ for maximum compatibility across Windows 10 and 11 without requiring extra runtimes.
- **Physics Performance**: All physics calculations must strictly adhere to the 240Hz Verlet integration engine. Maintain Gaussian distance constraint relaxation and sleep state efficiency (< 0.1% idle CPU).
- **Click-Through Integrity**: Any window interaction changes must preserve `WM_NCHITTEST` returning `HTTRANSPARENT` (-1) everywhere outside the active charm talisman to ensure underlying window controls (close, minimize, tabs) remain unobstructed.

## Pull Requests

1. Create a feature branch: `git checkout -b feature/my-new-charm`.
2. Commit your changes with descriptive commit messages.
3. Test compilation with `build.bat` and run integration tests with `npm test`.
4. Submit a pull request on GitHub!
