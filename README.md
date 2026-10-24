# EDI P2P Lending Library

React + Vite app. Data is stored in Firebase Firestore (free tier) and the site is hosted on GitHub Pages.

## 1. Try it locally (optional)
Needs Node.js 22 (or 20.19+).

    npm install
    npm run dev

With no Firebase settings it runs in demo mode: data stays in your browser only.

## 2. Create the Firebase database
1. console.firebase.google.com > Add project (Analytics not needed).
2. Build > Firestore Database > Create database > production mode, region europe-west2 (London) or eur3.
3. Project settings > General > Your apps > Web (</>) > register app. Copy the config values.
4. Open `src/firebase-config.js` and paste apiKey, authDomain, projectId, appId.
5. Firestore > Rules: paste the contents of `firestore.rules` and Publish.

Note: lenders have no real accounts, so the rules let anyone read and write the `kv` documents (within the limits in the rules). Treat the data as community-level, not confidential. Use the admin CSV export as your backup.

## 3. Publish on GitHub Pages
1. Create an empty repository on github.com.
2. Push this folder to it (branch `main`), or upload the files through the GitHub web page (extract the zip first, keep the `.github` folder).
3. Repository Settings > Pages > Source: GitHub Actions.
4. Open the Actions tab. When "Deploy to GitHub Pages" turns green your site is at https://USER.github.io/REPO/

Every later push to `main` redeploys automatically.

## 4. First run
Open the live site, scroll to the footer, click Admin and set the admin password straight away. Whoever sets it first becomes admin.

## Files
- `src/lending-library.jsx`: the app
- `src/storage.js`: Firestore adapter (localStorage in demo mode)
- `src/firebase-config.js`: your Firebase settings
- `src/assets/logo.png`: logo
- `.github/workflows/deploy.yml`: build and deploy
- `firestore.rules`: database rules
