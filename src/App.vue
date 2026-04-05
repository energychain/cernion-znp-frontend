<script setup>
import { ref, onMounted, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useZnpStore } from './store/znpStore'

const znpStore = useZnpStore()

const map = ref(null)
const polygonLayer = ref(null)
const targetLayer = ref(0)
const selectedVnb = ref('')

// NOVA Heuristics & §14a
const flex14a = ref(false)
const novaQU = ref(false)
const novaRONT = ref(false)

// Mock VNB Digital Data (Polygons & Center)
const vnbList = [
  { id: 'hd', name: 'Stadtwerke Heidelberg Netze', center: [49.40768, 8.69079], zoom: 12, geojson: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[8.63, 49.38], [8.74, 49.38], [8.74, 49.43], [8.63, 49.43], [8.63, 49.38]]] } } },
  { id: 'swn', name: 'Stadtwerke Neuwied', center: [50.4286, 7.4614], zoom: 12, geojson: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[7.40, 50.40], [7.50, 50.40], [7.50, 50.46], [7.40, 50.46], [7.40, 50.40]]] } } }
]

const gFactorMap = {
  0: { capacity: 1500, gFactor: 1.0, label: "Worst-Case (Public Baseline)", color: "text-red-600" },
  1: { capacity: 1100, gFactor: 0.73, label: "Räumliches Cluster (OSM)", color: "text-orange-500" },
  2: { capacity: 650, gFactor: 0.43, label: "Gemessene Last (Inhouse PDFs)", color: "text-amber-500" }
}

onMounted(() => {
  const m = L.map('map').setView([51.1657, 10.4515], 6)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(m)
  map.value = m
})

const selectVnb = async () => {
  const vnb = vnbList.find(v => v.id === selectedVnb.value)
  if (!vnb || !map.value) return

  map.value.flyTo(vnb.center, vnb.zoom)
  if (polygonLayer.value) map.value.removeLayer(polygonLayer.value)
  polygonLayer.value = L.geoJSON(vnb.geojson, { style: { color: '#3b82f6', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.2 } }).addTo(map.value)
  
  targetLayer.value = 0
  flex14a.value = false; novaQU.value = false; novaRONT.value = false;
  znpStore.layerStatus = { 0: false, 1: false, 2: false }
  znpStore.gFactorResult = null
  
  const bbox = { south: 49.38, west: 8.63, north: 49.43, east: 8.74 }
  await znpStore.initializeWorkspace(bbox)
  
  const mockAssets = [
    { mastrNummer: "SEE928374", capacity: 10.5, assetType: "solar", lat: 49.4, lon: 8.7 },
    { mastrNummer: "SEE182736", capacity: 5.0, assetType: "solar", lat: 49.41, lon: 8.69 },
    { mastrNummer: "SEE002938", capacity: 22.0, assetType: "solar", lat: 49.39, lon: 8.71 },
    { mastrNummer: "SEE554433", capacity: 8.5, assetType: "solar", lat: 49.42, lon: 8.68 },
    { mastrNummer: "SEE998877", capacity: 100.0, assetType: "solar", lat: 49.40, lon: 8.72 }
  ]
  await znpStore.ingestLayer0(mockAssets)
}

const fileInput = ref(null)
const triggerFileInput = () => { if (fileInput.value) fileInput.value.click() }

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  await znpStore.analyzePDFDocument(file)
  targetLayer.value = 2
}

// Compute the Pitch-Ready KPI Board based on Layers AND the new NOVA/14a Toggles
const currentKpi = computed(() => {
  if (!selectedVnb.value) return null;

  // Base calculation from Backend Layer or Mock
  let cap = gFactorMap[targetLayer.value].capacity;
  let gF = gFactorMap[targetLayer.value].gFactor;
  let label = gFactorMap[targetLayer.value].label;
  let color = gFactorMap[targetLayer.value].color;

  if (znpStore.gFactorResult && znpStore.currentLayer === targetLayer.value) {
    cap = znpStore.gFactorResult.adjustedCapacityKW || cap;
    gF = znpStore.gFactorResult.simultaneityFactor || gF;
  }

  // Apply §14a EnWG and NOVA Heuristics (Pitch Math)
  if (flex14a.value) {
    cap *= 0.85; gF *= 0.85;
    label = "§14a Spitzenkappung aktiv"; color = "text-green-500";
  }
  if (novaQU.value) {
    cap *= 0.90; gF *= 0.90; // +10-15% Capacity gain through Voltage Mgmt
    label = "Q(U) Optimierung aktiv"; color = "text-emerald-500";
  }
  if (novaRONT.value) {
    cap *= 0.60; gF *= 0.60; // +40-50% Capacity gain through rONT
    label = "rONT Verstärkung aktiv"; color = "text-teal-600";
  }

  return { capacity: Math.round(cap), gFactor: gF, label, color };
});

const generateReport = () => {
    znpStore.log(`Erstelle gesetzlichen Netzausbauplan-Report (PDF) für BNetzA...`);
    setTimeout(() => znpStore.log(`Report erfolgreich exportiert!`), 1200);
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col md:flex-row font-sans text-gray-800">
    <!-- Left: Leaflet Map -->
    <div class="w-full md:w-2/3 h-1/2 md:h-full relative z-0">
      <div id="map" class="w-full h-full"></div>
      <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 font-semibold text-sm flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="selectedVnb ? 'bg-green-500' : 'bg-red-500'"></span>
        {{ selectedVnb ? vnbList.find(v => v.id === selectedVnb).name : 'Kein Netzgebiet ausgewählt' }}
      </div>
    </div>

    <!-- Right: Control Panel (§14d EnWG Workflow) -->
    <div class="w-full md:w-1/3 h-1/2 md:h-full bg-slate-50 border-l border-gray-200 p-5 flex flex-col overflow-y-auto relative">
      <h1 class="text-xl font-bold mb-1">Cernion ZNP Workspace</h1>
      <p class="text-xs text-gray-500 mb-5 font-medium">Netzausbauplanung gemäß § 14d EnWG</p>

      <!-- Phase 1: Regionalszenario -->
      <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">1. Regionalszenario (MaStR)</h2>
        <select v-model="selectedVnb" @change="selectVnb" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-blue-500 mb-1 bg-white">
          <option value="" disabled>Verteilnetzbetreiber wählen...</option>
          <option v-for="vnb in vnbList" :key="vnb.id" :value="vnb.id">{{ vnb.name }}</option>
        </select>
        <p class="text-[10px] text-gray-500" v-if="selectedVnb">✅ Polygon, MaStR & OSM geladen.</p>
      </div>

      <!-- Phase 2: Ist-Netz & Engpassanalyse -->
      <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">2. Ist-Netz & Engpassanalyse</h2>
        
        <input type="range" min="0" max="2" step="1" v-model.number="targetLayer" @change="async () => { await znpStore.fetchGFactor(targetLayer); }" class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-1">
        <div class="flex justify-between text-[10px] text-gray-400 mb-3">
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[0] ? 'text-blue-500 font-bold' : '') : ''">L0 (MaStR)</span>
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[1] ? 'text-orange-500 font-bold' : '') : ''">L1 (OSM)</span>
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[2] ? 'text-green-600 font-bold' : '') : ''">L2 (Inhouse)</span>
        </div>

        <div @click="znpStore.layerStatus && !znpStore.layerStatus[2] && !znpStore.isProcessing ? triggerFileInput() : null" class="border border-dashed border-gray-300 rounded p-2 text-center cursor-pointer transition-colors" :class="znpStore.layerStatus && znpStore.layerStatus[2] ? 'bg-green-50 border-green-300' : 'hover:bg-blue-50'">
          <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.csv,.xlsx" class="hidden" />
          <div v-if="znpStore.isProcessing && znpStore.layerStatus && !znpStore.layerStatus[2]" class="text-blue-600 text-xs font-medium flex justify-center items-center gap-1">
            <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analysiere...
          </div>
          <div v-else-if="znpStore.layerStatus && znpStore.layerStatus[2]" class="text-green-600 text-xs font-bold">✅ Messdaten extrahiert (L2)</div>
          <div v-else class="text-gray-500 text-xs">📄 VNB Struktur-PDF hier ablegen</div>
        </div>
      </div>

      <!-- Phase 3: Flexibilität -->
      <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">3. Flexibilität (§14a / §42c)</h2>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" v-model="flex14a" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
          <span class="text-gray-700 text-xs font-medium">Steuerbare Verbrauchseinrichtungen (4,2 kW Mindestbezug) anrechnen</span>
        </label>
      </div>

      <!-- Phase 4: NOVA (Zielnetz) -->
      <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">4. Zielnetz-Entwicklung (NOVA)</h2>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" v-model="novaQU" class="w-4 h-4 text-blue-600 rounded border-gray-300">
            <span class="text-gray-700 text-xs">Blindleistungsmanagement (Q/U) - <span class="font-bold text-gray-500">O</span>ptimierung</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" v-model="novaRONT" class="w-4 h-4 text-blue-600 rounded border-gray-300">
            <span class="text-gray-700 text-xs">Einsatz rONT (Regelbarer Trafo) - <span class="font-bold text-gray-500">V</span>erstärkung</span>
          </label>
        </div>
      </div>

      <!-- KPI Dashboard -->
      <div v-if="currentKpi" class="mb-4 p-4 bg-white rounded-lg shadow-md border-t-4 transition-colors duration-300" :class="currentKpi.gFactor < 0.6 ? 'border-green-500' : (currentKpi.gFactor < 0.9 ? 'border-orange-400' : 'border-red-500')">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <div class="text-[10px] uppercase text-gray-400 mb-1">Peak-Last Engpass</div>
            <div class="text-2xl font-black" :class="currentKpi.color">{{ currentKpi.capacity }} <span class="text-xs font-normal text-gray-500">kW</span></div>
          </div>
          <div>
            <div class="text-[10px] uppercase text-gray-400 mb-1">Gleichzeitigkeit (g)</div>
            <div class="text-2xl font-black text-gray-700">{{ currentKpi.gFactor }}</div>
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
          <span class="text-[10px] font-bold text-gray-400">Vermiedener Ausbau (A):</span>
          <span class="text-sm font-bold" :class="currentKpi.capacity < 1500 ? 'text-green-600' : 'text-gray-300'">+ {{ 1500 - currentKpi.capacity }} kW</span>
        </div>
      </div>
      
      <!-- Phase 5: Reporting -->
      <button v-if="currentKpi" @click="generateReport" class="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded shadow mb-4 transition-colors">
        5. Netzausbauplan-Report generieren
      </button>

      <!-- Agent Log Console -->
      <div v-if="znpStore.logMessages.length > 0" class="p-2 bg-slate-900 rounded-lg shadow-inner overflow-y-auto h-24 border border-slate-700 font-mono text-[9px] leading-tight mt-auto">
        <div class="text-green-400 mb-1 font-bold border-b border-slate-700 pb-1">A²MDM Logs</div>
        <div v-for="(log, idx) in znpStore.logMessages" :key="idx">
          <span class="text-slate-500">[{{ log.time }}]</span> <span class="text-slate-300">{{ log.msg }}</span>
        </div>
      </div>

    </div>
  </div>
</template>
