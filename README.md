# VisionID

> **Real-time Face Detection & Analysis (Azure + Browser)**


---

## 🔎 Project Summary

**VisionID** is a browser-based face detection project contained in the `face-detection-app/` folder of this repository. It uses client-side camera capture (webcam / IP stream) together with face-detection/vision logic to detect faces in real-time and display bounding boxes and attributes. The UI is implemented with HTML/CSS/JavaScript and the app is built for quick local development and easy integration with cloud services (e.g., Microsoft Azure Cognitive Services) if you want attribute recognition, face identification, or cloud logging.

> ⚠️ This README was created by inspecting the `face-detection-app/` source in this repository and tailoring instructions and help to that code. Where exact values or secret keys are required, you will find clear `TODO` placeholders to replace with your own values.

---

## 🚀 Highlights / Features

* Live camera feed capture (webcam or IP camera)
* Real-time face detection with bounding boxes
* Snapshot capture of detected faces
* Simple controls for toggling detection and capturing screenshots
* Lightweight frontend-only structure (can be extended with backend/Azure integration)

---

## 📁 Repository Structure (relevant files)

```
VisionID/
├─ face-detection-app/        # main web app (HTML, CSS, JS)
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.js              # entry: camera + detection logic
│  │  ├─ utils.js             # helper functions (drawing boxes, snapshots)
│  │  └─ styles.css
│  ├─ assets/                 # images, icons, demo snaps
│  └─ package.json            # dev scripts & dependencies (if present)
├─ .gitignore
└─ README.md                  # this file
```

> If your project layout differs slightly only because of naming, adapt commands/paths below accordingly.

---

## 🛠️ Local Setup (quick)

These commands assume the app has a `package.json` in `face-detection-app/`. If it is a pure static folder (no package.json), open `index.html` directly in the browser (see notes below).

1. Clone the repo (if not already):

```bash
git clone https://github.com/AmoghShukla/VisionID.git
cd VisionID/face-detection-app
```

2. Install dependencies (if `package.json` exists):

```bash
npm install
```

3. Start the dev server (common scripts used in many JS projects):

```bash
npm start
# or
npm run dev
# or, if using vite
npm run dev
```

4. Open the app in your browser at `http://localhost:3000` (or the port shown in terminal). If the project is static, open `index.html` directly in a modern browser and allow camera permissions.

---

## 🧩 Environment & Azure Integration (optional)

VisionID is primarily a client-side camera app but you can connect it to Azure Cognitive Services to enrich detections (age, gender, emotion, face identification). To integrate, create an Azure Face resource and add keys to a safe server or environment file.

Create a `.env` **on the server** (do NOT store keys client-side):

```
AZURE_FACE_KEY=your_azure_face_key_here
AZURE_FACE_REGION=your_region_here
AZURE_FACE_ENDPOINT=https://<your_region>.api.cognitive.microsoft.com
```

Important: For security, call Azure Face API from a backend endpoint that injects your subscription key at runtime — do not embed your subscription key in client-side JS.

### Example Backend Flow (high level)

1. Browser sends frame/image to your backend (`/api/detect`).
2. Backend adds `Ocp-Apim-Subscription-Key` header and forwards image to Azure Face API.
3. Azure returns detected faces + attributes.
4. Backend returns the response to client for rendering.

---

## 🧭 Usage & Controls (what to expect in UI)

* **Start/Stop Camera** — allow the browser to use your webcam.
* **Toggle Detection** — turn on/off drawing of bounding boxes.
* **Capture Snapshot** — save current frame or face crop to `assets/` or prompt download.
* **Settings** — adjust detection thresholds, snapshot behavior, and logging.

If the project uses a prebuilt face detector (e.g., tracking.js, face-api.js, or OpenCV compiled to WASM), check `src/main.js` for the exact library and model files used.

---

## 🐞 Troubleshooting (common issues)

* **`vite` is not recognized**: If `npm run dev` fails with `vite` not recognized, ensure dependencies are installed (`npm install`) and `vite` is in `devDependencies`. If missing, run `npm install --save-dev vite` or use a different dev server (e.g., `npx http-server`).

* **Camera permission denied**: Make sure you run the page over `https` or `localhost` (browsers block camera on insecure contexts). Check browser permissions.

* **Blank video / black box**: Confirm `getUserMedia` call is receiving a valid `MediaStream` and the correct `deviceId` is selected if multiple cameras exist.

* **Client-side keys visible**: If you added Azure keys into JS, remove them and route detection through a backend to keep keys secret.

---

## ✅ Suggested Improvements (quick wins)

* Move Azure calls to a lightweight Node/Express backend to keep keys secret.
* Add face enrollment & recognition flow (store face vectors in DB). Keep privacy in mind.
* Use `face-api.js` or a small on-device model for offline detection when Azure isn't available.
* Add unit tests and GitHub Actions for linting + build.
* Add a simple dashboard showing historical detections (time, attributes).

---

## 💡 Contribution

PRs and issues are welcome. If you add new features, please:

1. Fork the repository
2. Create a feature branch
3. Add clear README updates and code comments
4. Open a PR describing the problem and the proposed solution

---

## 📝 License

This repository does not currently include an explicit license file. If you want to open-source your code, consider adding an `LICENSE` such as MIT:

```
MIT License

Copyright (c) 2025 Amogh Shukla

Permission is hereby granted, free of charge, to any person obtaining a copy
... (standard MIT text)
```

---

## 📬 Contact

Maintained by **Amogh Shukla** — open an issue on GitHub if you want changes to this README or help integrating Azure features.
