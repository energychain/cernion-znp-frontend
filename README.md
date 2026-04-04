# Cernion ZNP Workspace (Frontend)

Dieses Repository enthält den **Vue 3 + Vite** Prototypen für das Cernion Zielnetzplanung (ZNP) Dashboard.
Es dient primär als interaktiver Sales-Showcase ("What-If"-Slider) für Verteilnetzbetreiber (VNBs), um den Wert der Cernion "Data Layers" (Senkung des g-Faktors zur Vermeidung von Kupferausbau) visuell und iterativ darzustellen.

## 🚀 Features (v0.1.0)
*   **VNB Onboarding (Step 0):** Auswahl neutraler Netzgebiete (z.B. Stadtwerke Heidelberg). Das System lädt simuliert Bounding-Boxen / Polygone (aus VNBDigital-Daten) und fliegt auf der Leaflet-Karte in das entsprechende Netzgebiet.
*   **What-If Slider (Step 2):** Ein interaktiver Schieberegler, der dem VNB-Planer zeigt, wie sich der berechnete Netzausbaubedarf (kW Peak-Last) reduziert, je höher die Datengüte (Layer 0: MaStR $\rightarrow$ Layer 1: OSM $\rightarrow$ Layer 2: Inhouse PDFs) im Cernion-Backend wird.
*   **Live KPI Dashboard (Step 3):** Zeigt den resultierenden Gleichzeitigkeitsfaktor ($g$-Faktor) und die direkte "Kupfer-Ersparnis" in kW an.

## 🛠️ Tech Stack
*   **Framework:** Vue 3 (Composition API)
*   **Build Tool:** Vite
*   **State Management:** Pinia
*   **Mapping:** Leaflet.js
*   **Styling:** Tailwind CSS (via CDN für Rapid Prototyping)

## 📦 Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Standard: http://localhost:5173)
npm run dev
```

*Für den Betrieb auf dem OpenClaw-Gateway via PM2:*
```bash
pm2 start npm --name "cernion-znp-frontend" -- run dev -- --host 0.0.0.0 --port 5174
```

## 🔌 Backend Integration (Cernion Energy Tools)
Dieses Frontend ist als Client für die Cernion Energy Tools (OpenAPI v0.21+) konzipiert.
Aktuell (im Mockup-Modus) simuliert der Button "Netzausbau berechnen" die Backend-Calls mit hartcodierten Werten. 

In der Produktionsumgebung ruft das Frontend folgende Endpunkte im Moleculer-Backend auf:
1.  `POST /api/znp/projects` (bei Auswahl des VNBs / Generierung der BBox)
2.  `POST /api/znp/projects/:projectId/layer0` (bei Klick auf "MaStR Assets & OSM laden")
3.  `GET /api/znp/projects/:projectId/g-factor?target_layer={0|1|2}` (bei Bewegung des What-If-Sliders)

## ⚠️ Bekannte Limitierungen (Prototyp)
1. **Button "Datenbasis laden":** Aktuell ist dieser Button (`Step 1`) nur ein visueller Platzhalter (Dummy) für den Sales-Pitch. Er löst noch keinen echten `POST`-Call zum Backend aus, der tausende MaStR-Punkte auf die Karte laden würde. Das Rendering von $>10.000$ Markern auf einer Leaflet-Karte bedarf in v0.2.0 eines Canvas/WebGL-Renderers (z.B. Leaflet.glify oder Deck.gl).
2. **Mock-Daten:** Die im `App.vue` hinterlegten Polygone für Heidelberg/Neuwied sind vereinfachte Bounding-Boxes und nicht die exakten VNBDigital-Geometrien.
