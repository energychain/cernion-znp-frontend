<script setup>
import { ref, onMounted, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useZnpStore } from './store/znpStore'
import ModalAssetTable from './components/ModalAssetTable.vue'
import ModalPdfData from './components/ModalPdfData.vue'

const znpStore = useZnpStore()

const map = ref(null)
const polygonLayer = ref(null)
const targetLayer = ref(0)
const selectedVnb = ref('')

// Conversational Planner Input
const plannerInput = ref('')

// Mock VNB Digital Data (Polygons & Center)
const vnbList = [
  { id: 'hd', name: 'Stadtwerke Heidelberg Netze', center: [49.40768, 8.69079], zoom: 12, geojson: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[8.63, 49.38], [8.74, 49.38], [8.74, 49.43], [8.63, 49.43], [8.63, 49.38]]] } } },
  { id: 'swn', name: 'Stadtwerke Neuwied', center: [50.4286, 7.4614], zoom: 12, geojson: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[7.40, 50.40], [7.50, 50.40], [7.50, 50.46], [7.40, 50.46], [7.40, 50.40]]] } } }
]

const gFactorMap = {
  0: { capacity: 1500, gFactor: 1.0, label: "Worst-Case (Public Baseline)", color: "text-red-600" },
  1: { capacity: 1100, gFactor: 0.73, label: "Räumliches Cluster (OSM)", color: "text-orange-500" },
  2: { capacity: 650, gFactor: 0.43, label: "Gemessene Last (Inhouse PDFs)", color: "text-amber-500" },
  2.5: { capacity: 650, gFactor: 0.13, label: "Strategische Planung (Flex NAV)", color: "text-emerald-600" } // The Chatbot reward
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
  plannerInput.value = ''
  
  const bbox = { south: 49.38, west: 8.63, north: 49.43, east: 8.74 }
  await znpStore.initializeWorkspace(bbox, vnb.id)
  
  const mockAssets = [
    { mastrNummer: "SEE928374", capacity: 10.5, assetType: "solar", status: "In Betrieb", commissioningDate: "2015-05-12", lat: 49.4, lon: 8.7 },
    { mastrNummer: "SEE182736", capacity: 5.0, assetType: "solar", status: "In Betrieb", commissioningDate: "2018-08-20", lat: 49.41, lon: 8.69 },
    { mastrNummer: "SEE002938", capacity: 22.0, assetType: "solar", status: "In Betrieb", commissioningDate: "2020-01-10", lat: 49.39, lon: 8.71 },
    { mastrNummer: "SEE554433", capacity: 8.5, assetType: "solar", status: "In Betrieb", commissioningDate: "2021-06-30", lat: 49.42, lon: 8.68 },
    { mastrNummer: "SEE998877", capacity: 100.0, assetType: "solar", status: "In Planung", commissioningDate: "2026-10-01", lat: 49.40, lon: 8.72 },
    { mastrNummer: "SEE443322", capacity: 50.0, assetType: "storage", status: "In Planung", commissioningDate: "2026-11-15", lat: 49.38, lon: 8.64 },
    { mastrNummer: "SEE776655", capacity: 15.0, assetType: "storage", status: "In Betrieb", commissioningDate: "2023-04-05", lat: 49.41, lon: 8.73 }
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

const sendStrategicAssumption = async () => {
  if (!plannerInput.value.trim()) return
  
  // KI Extraktion triggern
  await znpStore.addStrategicAssumption(plannerInput.value)
  plannerInput.value = ''
  
  // Wenn flexibel, belohnen wir mit Layer 2.5 KPI (0 Kupferausbau)
  targetLayer.value = 2.5
}

// Compute the Pitch-Ready KPI Board based on Layers
const currentKpi = computed(() => {
  if (!selectedVnb.value) return null;
  const layerKey = Math.floor(targetLayer.value); // Fallback falls 2.5 nicht da
  
  let cap = znpStore.gFactorResult ? znpStore.gFactorResult.capacity : gFactorMap[layerKey].capacity;
  let gF = znpStore.gFactorResult ? znpStore.gFactorResult.simultaneityFactor : gFactorMap[layerKey].gFactor;
  let label = gFactorMap[layerKey].label;
  let color = gFactorMap[layerKey].color;

  // Layer 2.5 (Strategic Assumption) Override
  if (targetLayer.value === 2.5 && znpStore.strategicAssumptions.length > 0) {
      const lastAssumption = znpStore.strategicAssumptions[znpStore.strategicAssumptions.length - 1];
      if (lastAssumption.hasFlexibleNav) {
          // Keine zusätzliche Kupferlast für die 5 MW, der g-Faktor sinkt drastisch durch den flexiblen Großspeicher
          cap = 650; 
          gF = 0.13; // (650 kW / (1500 kW + 5000 kW) = 0.1)
          label = "Strategische Planung (Flexibler NAV)"; 
          color = "text-emerald-600";
      } else {
          // Erschreckender Worst Case: Der 5 MW Speicher wird knallhart mit 1.0 oben drauf gerechnet
          cap = 5650; 
          gF = 1.0; 
          label = "Warnung: Kritischer Netzausbau (Starrer Anschluss)"; 
          color = "text-red-600";
      }
  }

  return { capacity: Math.round(cap), gFactor: gF, label, color };
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col md:flex-row font-sans text-gray-800">
    <!-- Left: Leaflet Map -->
    <div class="w-full md:w-2/3 h-1/2 md:h-full relative z-0">
      <div id="map" class="w-full h-full"></div>
      
      <!-- NEW: Information Feedback Loop (Layer 0 MaStR Stats Overlay) -->
      <transition enter-active-class="transition ease-out duration-300" enter-from-class="transform opacity-0 -translate-y-4" enter-to-class="transform opacity-100 translate-y-0">
          <div v-if="znpStore.networkStats" @click="znpStore.openModal('assets')" class="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-xs w-64 cursor-pointer hover:bg-slate-50 transition-colors group">
            <div class="font-bold border-b border-gray-100 pb-1 mb-2 text-gray-700 flex justify-between items-center">
                <span>📊 MaStR Inventar</span>
                <span class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Details ↗</span>
            </div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">PV-Anlagen:</span> <span class="font-bold">{{znpStore.networkStats.pv.count}} ({{znpStore.networkStats.pv.totalKw}} kW)</span></div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">Speicher:</span> <span class="font-bold">{{znpStore.networkStats.storage.count}}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Wind / KWK:</span> <span class="font-bold">{{znpStore.networkStats.wind.count + znpStore.networkStats.chp.count}}</span></div>
          </div>
      </transition>
    </div>

    <!-- Right: Control Panel (§14d EnWG Workflow) -->
    <div class="w-full md:w-1/3 h-1/2 md:h-full bg-slate-50 border-l border-gray-200 flex flex-col relative overflow-hidden">
      
      <div class="p-5 flex-shrink-0">
          <h1 class="text-xl font-bold mb-1">Cernion ZNP Workspace</h1>
          <p class="text-xs text-gray-500 font-medium">Iterative Netzplanung als "Living Document"</p>
      </div>

      <div class="p-5 overflow-y-auto flex-grow pb-24">
          <!-- Phase 1: Regionalszenario -->
          <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
            <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">1. Regionalszenario & Topologie</h2>
            <select v-model="selectedVnb" @change="selectVnb" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-blue-500 mb-1 bg-white">
              <option value="" disabled>Verteilnetzbetreiber wählen...</option>
              <option v-for="vnb in vnbList" :key="vnb.id" :value="vnb.id">{{ vnb.name }}</option>
            </select>
          </div>

          <!-- Phase 2: Unstrukturierte Inhouse Daten (PDF) -->
          <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !selectedVnb}">
            <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">2. Inhouse Intelligence (PDF Extraktion)</h2>
            <div @click="znpStore.layerStatus && !znpStore.layerStatus[2] && !znpStore.isProcessing ? triggerFileInput() : null" class="border border-dashed border-gray-300 rounded p-2 text-center cursor-pointer transition-colors mb-3" :class="znpStore.layerStatus && znpStore.layerStatus[2] ? 'bg-green-50 border-green-300' : 'hover:bg-blue-50'">
              <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.csv,.xlsx" class="hidden" />
              <div v-if="znpStore.isProcessing && znpStore.layerStatus && !znpStore.layerStatus[2]" class="text-blue-600 text-xs font-medium flex justify-center items-center gap-1">
                <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analysiere Strukturdaten...
              </div>
              <div v-else-if="znpStore.layerStatus && znpStore.layerStatus[2]" class="text-green-600 text-xs font-bold">✅ Messdaten in Graphen integriert</div>
              <div v-else class="text-gray-500 text-xs">📄 VNB StromNZV §23c Berichte hier ablegen</div>
            </div>

            <!-- NEW: Information Feedback Loop (Extracted Document Data) -->
            <transition enter-active-class="transition ease-out duration-300" enter-from-class="transform opacity-0 -translate-y-2" enter-to-class="transform opacity-100 translate-y-0">
                <div v-if="znpStore.extractedPdfData" @click="znpStore.openModal('documents')" class="bg-slate-50 p-2 rounded text-[10px] text-gray-600 border border-gray-200 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div class="font-bold mb-1 text-gray-700 flex justify-between items-center">
                        <span>🔍 Extrahierte Inhouse-Parameter:</span>
                        <span class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Details ↗</span>
                    </div>
                    <div><span class="font-medium">Jahreshöchstlast (Einspeisung):</span> {{znpStore.extractedPdfData.peakFeedIn.value}} kW</div>
                    <div><span class="font-medium">Jahreshöchstlast (Entnahme):</span> {{znpStore.extractedPdfData.peakLoad.value}} kW</div>
                    <div class="text-gray-400 mt-1 italic truncate">Quelle: {{znpStore.extractedPdfData.docName}}</div>
                </div>
            </transition>
          </div>

          <!-- Phase 3: Conversational Advisor (Layer 2.5) -->
          <div class="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100" :class="{'opacity-50 pointer-events-none': !znpStore.layerStatus || !znpStore.layerStatus[2]}">
            <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">3. Strategic Planning Context</h2>
            <div class="bg-blue-50 text-blue-800 text-[10px] p-2 rounded mb-2 border border-blue-100">
                <span class="font-bold">Cernion A²MDM fragt:</span><br/>
                Ich erkenne ein 15ha Gewerbegebiet (OSM) in diesem Polygon. Sind für die kommenden 3 Jahre bereits konkrete Bauvoranfragen (z.B. Rechenzentren, Großspeicher) bekannt, die noch nicht im MaStR erfasst sind?
            </div>
            
            <!-- Chat Input -->
            <div class="flex flex-col gap-2">
                <textarea 
                    v-model="plannerInput" 
                    placeholder="Planer-Wissen teilen (z.B. 'Am Brückweg ist ein 5MW Speicher mit flexiblem NAV geplant...')"
                    class="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-16 bg-white"
                ></textarea>
                <button 
                    @click="sendStrategicAssumption" 
                    :disabled="!plannerInput || znpStore.isProcessing"
                    class="self-end bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow transition-colors disabled:opacity-50"
                >
                    Wissen in Graphen einspeisen
                </button>
            </div>

            <!-- NEW: Information Feedback Loop (Assumptions) -->
            <div v-if="znpStore.strategicAssumptions.length > 0" class="mt-3">
                <div v-for="asset in znpStore.strategicAssumptions" :key="asset.id" class="bg-emerald-50 border border-emerald-200 p-2 rounded text-[10px] flex justify-between items-center mb-1">
                    <div>
                        <span class="font-bold text-emerald-800">{{asset.capacityKw}} kW {{asset.type}}</span> <span class="text-emerald-600">({{asset.location}})</span>
                    </div>
                    <span v-if="asset.hasFlexibleNav" class="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Flex. NAV (§14a)</span>
                    <span v-else class="bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold">Starrer Anschluss</span>
                </div>
            </div>
          </div>
          
          <!-- What-If Slider (Now hidden in logic, driven by targetLayer but visualised as timeline) -->
          <div class="mb-4" v-if="selectedVnb">
            <div class="flex justify-between text-[10px] text-gray-400 px-1 mb-1 font-bold">
              <span :class="znpStore.currentLayer === 0 ? 'text-blue-600' : (znpStore.currentLayer > 0 ? 'text-green-500' : '')">MaStR</span>
              <span :class="znpStore.currentLayer === 2 ? 'text-blue-600' : (znpStore.currentLayer > 2 ? 'text-green-500' : '')">PDF Upload</span>
              <span :class="znpStore.currentLayer === 2.5 ? 'text-blue-600' : ''">Strategie</span>
            </div>
            <div class="w-full h-1 bg-gray-200 rounded overflow-hidden flex">
                <div class="h-full transition-all duration-500 bg-green-500" :style="`width: ${znpStore.currentLayer === 0 ? '33' : (znpStore.currentLayer === 2 ? '66' : '100')}%`"></div>
            </div>
          </div>

      </div>

      <!-- Bottom Fixed Area: KPI Dashboard & Logs -->
      <div class="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-gray-200 p-5 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          <div v-if="currentKpi" class="bg-white rounded-lg shadow-md border-l-4 p-3 transition-colors duration-300" :class="currentKpi.gFactor < 0.6 ? 'border-green-500' : (currentKpi.gFactor < 0.9 ? 'border-orange-400' : 'border-red-500')">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <div class="text-[9px] uppercase text-gray-400 mb-0.5">Simulierter Engpass (Netz)</div>
                <div class="text-xl font-black leading-none" :class="currentKpi.color">{{ currentKpi.capacity }} <span class="text-xs font-normal text-gray-500">kW</span></div>
              </div>
              <div>
                <div class="text-[9px] uppercase text-gray-400 mb-0.5">g-Faktor Ø</div>
                <div class="text-xl font-black text-gray-700 leading-none">{{ currentKpi.gFactor }}</div>
              </div>
            </div>
            <div class="text-[10px] font-bold text-gray-400 mt-2 border-t border-gray-100 pt-1.5 flex justify-between">
                <span>Szenario: {{currentKpi.label}}</span>
                <span v-if="currentKpi.capacity < 1500" class="text-green-600">+ {{ 1500 - currentKpi.capacity }} kW frei</span>
            </div>
          </div>
          
          <!-- Agent Log Console -->
          <div v-if="znpStore.logMessages.length > 0" class="mt-3 p-1.5 bg-slate-900 rounded shadow-inner overflow-y-auto h-16 border border-slate-700 font-mono text-[8px] leading-tight">
            <div v-for="(log, idx) in [...znpStore.logMessages].reverse()" :key="idx">
              <span class="text-slate-500">[{{ log.time }}]</span> <span class="text-slate-300">{{ log.msg }}</span>
            </div>
          </div>
      </div>

    </div>
  </div>

  <!-- Modals -->
  <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <ModalAssetTable 
      v-if="znpStore.activeModal === 'assets'" 
      :assets="znpStore.assets" 
      @close="znpStore.closeModal()" 
    />
  </transition>

  <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <ModalPdfData 
      v-if="znpStore.activeModal === 'documents'" 
      :pdfData="znpStore.extractedPdfData" 
      @close="znpStore.closeModal()" 
    />
  </transition>
</template>

<style>
body { margin: 0; }
</style>
