<script setup>
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useZnpStore } from './store/znpStore'

const znpStore = useZnpStore()

const map = ref(null)
const polygonLayer = ref(null)
const targetLayer = ref(0)
const gFactorResult = ref(null)
const uploadComplete = ref(false)
const selectedVnb = ref('')

// Mock VNB Digital Data (Polygons & Center)
const vnbList = [
  { 
    id: 'hd', 
    name: 'Stadtwerke Heidelberg Netze', 
    center: [49.40768, 8.69079], 
    zoom: 12, 
    geojson: { 
      type: "Feature", 
      properties: {}, 
      geometry: { 
        type: "Polygon", 
        coordinates: [[[8.63, 49.38], [8.74, 49.38], [8.74, 49.43], [8.63, 49.43], [8.63, 49.38]]] 
      } 
    } 
  },
  { 
    id: 'swn', 
    name: 'Stadtwerke Neuwied', 
    center: [50.4286, 7.4614], 
    zoom: 12, 
    geojson: { 
      type: "Feature", 
      properties: {}, 
      geometry: { 
        type: "Polygon", 
        coordinates: [[[7.40, 50.40], [7.50, 50.40], [7.50, 50.46], [7.40, 50.46], [7.40, 50.40]]] 
      } 
    } 
  }
]

// Fallback Maps if backend is not connected yet
const gFactorMap = {
  0: { capacity: 1500, gFactor: 1.0, label: "Worst-Case (Public Baseline)", color: "text-red-600" },
  1: { capacity: 1100, gFactor: 0.73, label: "Räumliches Cluster (OSM)", color: "text-orange-500" },
  2: { capacity: 650, gFactor: 0.43, label: "Gemessene Last (Inhouse PDFs)", color: "text-green-600" }
}

onMounted(() => {
  // Start view: Germany
  const m = L.map('map').setView([51.1657, 10.4515], 6)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(m)
  map.value = m
})

const selectVnb = async () => {
  const vnb = vnbList.find(v => v.id === selectedVnb.value)
  if (!vnb || !map.value) return

  // Fly to the VNB area
  map.value.flyTo(vnb.center, vnb.zoom)

  if (polygonLayer.value) {
    map.value.removeLayer(polygonLayer.value)
  }

  polygonLayer.value = L.geoJSON(vnb.geojson, {
    style: { color: '#3b82f6', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.2 }
  }).addTo(map.value)
  
  // Real Backend Logic kicks in: Create Workspace & Load MaStR
  targetLayer.value = 0
  gFactorResult.value = null
  znpStore.layerStatus = { 0: false, 1: false, 2: false }
  
  // Create Project in Backend (via Pinia Store)
  const bbox = { south: 49.38, west: 8.63, north: 49.43, east: 8.74 }
  await znpStore.initializeWorkspace(bbox)
  
  // Mock 5 Assets for Layer 0 (Normally fetched from /api/assets/all via BBox)
  const mockAssets = [
    { mastrNummer: "SEE928374", capacity: 10.5, assetType: "solar", lat: 49.4, lon: 8.7 },
    { mastrNummer: "SEE182736", capacity: 5.0, assetType: "solar", lat: 49.41, lon: 8.69 },
    { mastrNummer: "SEE002938", capacity: 22.0, assetType: "solar", lat: 49.39, lon: 8.71 },
    { mastrNummer: "SEE554433", capacity: 8.5, assetType: "solar", lat: 49.42, lon: 8.68 },
    { mastrNummer: "SEE998877", capacity: 100.0, assetType: "solar", lat: 49.40, lon: 8.72 }
  ]
  await znpStore.ingestLayer0(mockAssets)
  
  // Update UI with real backend result or fallback
  updateKpi()
}

const fileInput = ref(null)

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  await znpStore.analyzePDFDocument(file)
  
  // Auto-shift slider to Layer 2 to show the ROI
  targetLayer.value = 2
  updateKpi()
}

const updateKpi = async () => {
  if (!selectedVnb.value) return
  
  // If backend returned real values in store, use them, otherwise use mock map
  if (znpStore.gFactorResult) {
     gFactorResult.value = {
         capacity: znpStore.gFactorResult.adjustedCapacityKW || gFactorMap[targetLayer.value].capacity,
         gFactor: znpStore.gFactorResult.simultaneityFactor || gFactorMap[targetLayer.value].gFactor,
         label: targetLayer.value === 2 ? "Gemessene Last (Inhouse PDFs)" : (targetLayer.value === 1 ? "Räumliches Cluster (OSM)" : "Worst-Case (Public Baseline)"),
         color: targetLayer.value === 2 ? "text-green-600" : (targetLayer.value === 1 ? "text-orange-500" : "text-red-600")
     }
  } else {
     gFactorResult.value = gFactorMap[targetLayer.value]
  }
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

    <!-- Right: Control Panel -->
    <div class="w-full md:w-1/3 h-1/2 md:h-full bg-slate-50 border-l border-gray-200 p-6 flex flex-col overflow-y-auto relative">
      <h1 class="text-2xl font-bold mb-2">Cernion Zielnetzplanung</h1>
      <p class="text-sm text-gray-500 mb-6">Iterative Datenanreicherung zur Senkung des Kupferausbaus.</p>

      <!-- Step 1: VNB Selection (The Baseline) -->
      <div class="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">1. Netzgebiet & Baseline (MaStR)</h2>
        <select v-model="selectedVnb" @change="selectVnb" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 bg-white">
          <option value="" disabled>Verteilnetzbetreiber wählen...</option>
          <option v-for="vnb in vnbList" :key="vnb.id" :value="vnb.id">{{ vnb.name }}</option>
        </select>
        <p class="text-xs text-gray-500" v-if="selectedVnb">✅ Polygon geladen. MaStR-Basisdaten & Wetter initialisiert (Layer 0).</p>
      </div>

      <!-- Step 2: Unstructured Data Ingestion (The Cernion Magic) -->
      <div class="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">2. KI-Datenanreicherung (Inhouse)</h2>
        <p class="text-xs text-gray-500 mb-3">Laden Sie unstrukturierte Veröffentlichungspflichten (PDF/XLSX/CSV) zur KI-Extraktion der realen Netzauslastung hoch.</p>
        
        <div 
          @click="znpStore.layerStatus && !znpStore.layerStatus[2] && !znpStore.isProcessing ? triggerFileInput() : null"
          class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer transition-colors"
          :class="znpStore.layerStatus && znpStore.layerStatus[2] ? 'bg-green-50 border-green-300' : 'hover:bg-blue-50 hover:border-blue-400'"
        >
          <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.csv,.xlsx" class="hidden" />

          <div v-if="znpStore.isProcessing && znpStore.layerStatus && !znpStore.layerStatus[2]" class="text-blue-600 font-medium text-sm flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Analysiere Dokumente...
          </div>
          <div v-else-if="znpStore.layerStatus && znpStore.layerStatus[2]" class="text-green-600 font-medium text-sm">
            ✅ Lastspitzen extrahiert (Layer 2 aktiv)
          </div>
          <div v-else class="text-gray-600 font-medium text-sm">
            📄 Dokumente hier ablegen (z.B. StromNZV_23c.pdf)
          </div>
        </div>
      </div>

      <!-- Step 3: What-If Slider -->
      <div class="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
        <div class="flex justify-between items-end mb-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">3. "What-If" Analyse</h2>
          <span class="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">Layer {{ targetLayer }}</span>
        </div>
        
        <input 
          type="range" 
          min="0" max="2" step="1" 
          v-model.number="targetLayer"
          @change="async () => { await znpStore.fetchGFactor(targetLayer); updateKpi(); }"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
        >
        
        <div class="flex justify-between text-xs text-gray-400 mb-2">
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[0] ? 'text-blue-500 font-bold' : '') : ''">L0 (MaStR)</span>
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[1] ? 'text-orange-500 font-bold' : '') : ''">L1 (OSM)</span>
          <span :class="znpStore.layerStatus ? (znpStore.layerStatus[2] ? 'text-green-600 font-bold' : '') : ''">L2 (Inhouse)</span>
        </div>
      </div>

      <!-- Step 4: KPI Dashboard -->
      <div v-if="gFactorResult" class="flex-grow p-5 bg-white rounded-xl shadow-md border-t-4 transition-colors duration-300" :class="targetLayer === 2 ? 'border-green-500' : (targetLayer === 1 ? 'border-orange-400' : 'border-red-500')">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1">Ausbau-Bedarf</h2>
        <p class="text-xs font-medium mb-6" :class="targetLayer === 2 ? 'text-green-600' : (targetLayer === 1 ? 'text-orange-500' : 'text-red-500')">{{ gFactorResult.label }}</p>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-400 mb-1">Erwartete Last</div>
            <div class="text-3xl font-bold" :class="gFactorResult.color">
              {{ gFactorResult.capacity }} <span class="text-sm font-normal text-gray-500">kW</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400 mb-1">g-Faktor</div>
            <div class="text-3xl font-bold text-gray-700">
              {{ gFactorResult.gFactor.toFixed(2) }}
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-4 border-t border-gray-100" v-if="gFactorResult.gFactor < 1">
          <div class="text-xs text-gray-400 mb-1">Kupfer-Ersparnis vs Layer 0</div>
          <div class="text-lg font-semibold" :class="targetLayer > 0 ? 'text-green-600' : 'text-gray-400'">
            {{ targetLayer > 0 ? `+ ${(1500 - gFactorResult.capacity).toFixed(0)} kW freie Kapazität` : '-' }}
          </div>
        </div>
      </div>
      
      <div v-else class="flex-grow flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
        <span class="text-gray-400 text-sm text-center px-4">Bitte Netzgebiet wählen und Berechnung starten</span>
      </div>

      <!-- NEW: The "Chain of Thought" Agent Log Console -->
      <div v-if="znpStore.logMessages.length > 0" class="mt-4 p-3 bg-slate-900 rounded-lg shadow-inner overflow-y-auto max-h-48 border border-slate-700 font-mono text-[10px] leading-tight">
        <div class="text-green-400 mb-2 font-bold border-b border-slate-700 pb-1">Cernion A²MDM Agent Logs</div>
        <div v-for="(log, idx) in znpStore.logMessages" :key="idx" class="mb-1">
          <span class="text-slate-500">[{{ log.time }}]</span> 
          <span class="text-slate-300 ml-2">{{ log.msg }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style>
body { margin: 0; }
</style>
