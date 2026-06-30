# Frozen Inventory — Browser App

This is a browser-only inventory application for production, batch-wise stock, dispatch, returns, damage, and export reports.

Quick start

- Open the app directly in your browser:

  1. Open `stock.html` in your browser (double-click or `File -> Open`).

- Run using a local dev server (recommended for proper file:// behavior):

  In PowerShell (if `npm` is blocked by execution policy) use the `npm.cmd` wrapper or open a Command Prompt:

  ```powershell
  cd C:\Users\jatin\Downloads\dispatch.html
  npm.cmd install
  npm.cmd run dev
  ```

  Or in Command Prompt (cmd.exe):

  ```cmd
  cd C:\Users\jatin\Downloads\dispatch.html
  npm install
  npm run dev
  ```

Notes and troubleshooting

- Primary app script: `js/app.js` — the inventory logic lives here.
- CSS: `css/style.css`.
- If PowerShell shows `npm.ps1 cannot be loaded` error, run:

  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  ```

  or use `npm.cmd` as shown above.

- There is an extra older helper file at `css/js/app.js`. The active app uses `js/app.js`.

Next steps I can do for you

- Tweak the UI or add persistent storage (localStorage).  
- Remove or consolidate the duplicate script file.  
- Add automated tests or integrate a small backend when you want to persist data.

Tell me which next step you want.