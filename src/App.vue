<script setup>
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const map = ref(null)
const targetLayer = ref(0)
const gFactorResult = ref(null)
const isLoading = ref(false)

const gFactorMap = {
  0: { capacity: 1500, gFactor: 1.0, label: "Worst-Case (Public Baseline)", color: "text-red-600" },
  1: { capacity: 1100, gFactor: 0.73, label: "Räumliches Cluster (OSM)", color: "text-orange-500" },
  2: { capacity: 650, gFactor: 0.43, label: "Gemessene Last (Inhouse PDFs)", color: "text-green-600" }
}

onMounted(() => {
  const m = L.map('map').setView([49.4875, 8.4660], 13) // Mannheim
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(m)
  map.value = m
})

const calculateZnp = async () => {
  isLoading.value = true
  
  // Mock API Call delay (would hit /api/projects/:id/g-factor?target_layer=X)
  await new Promise(r => setTimeout(r, 600))
  
  gFactorResult.value = gFactorMap[targetLayer.value]
  isLoading.value = false
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col md:flex-row font-sans text-gray-800">
    
    <!-- Left: Leaflet Map -->
    <div class="w-full md:w-2/3 h-1/2 md:h-full relative z-0">
      <div id="map" class="w-full h-full"></div>
      <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 font-semibold text-sm">
        Cernion ZNP Workspace (Mannheim Süd)
      </div>
    </div>

    <!-- Right: Control Panel -->
    <div class="w-full md:w-1/3 h-1/2 md:h-full bg-slate-50 border-l border-gray-200 p-6 flex flex-col overflow-y-auto">
      <h1 class="text-2xl font-bold mb-2">Zielnetzplanung</h1>
      <p class="text-sm text-gray-500 mb-8">Iterative Datenanreicherung zur Senkung des Kupferausbaus.</p>

      <!-- Step 1: Base Data -->
      <div class="mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">1. Datenbasis</h2>
        <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
          MaStR Assets & OSM Topologie laden
        </button>
      </div>

      <!-- Step 2: What-If Slider -->
      <div class="mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-end mb-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">2. "What-If" Analyse</h2>
          <span class="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">Layer {{ targetLayer }}</span>
        </div>
        
        <input 
          type="range" 
          min="0" max="2" step="1" 
          v-model.number="targetLayer"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
        >
        
        <div class="flex justify-between text-xs text-gray-400 mb-6">
          <span>L0 (MaStR)</span>
          <span>L1 (OSM)</span>
          <span>L2 (PDFs)</span>
        </div>

        <button 
          @click="calculateZnp"
          :disabled="isLoading"
          class="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded transition-colors shadow-md disabled:opacity-50"
        >
          {{ isLoading ? 'Berechne...' : 'Netzausbau berechnen' }}
        </button>
      </div>

      <!-- Step 3: KPI Dashboard -->
      <div v-if="gFactorResult" class="flex-grow p-5 bg-white rounded-xl shadow-md border-t-4" :class="targetLayer === 2 ? 'border-green-500' : (targetLayer === 1 ? 'border-orange-400' : 'border-red-500')">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1">Ergebnis</h2>
        <p class="text-xs text-gray-500 mb-6">{{ gFactorResult.label }}</p>
        
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
            {{ targetLayer > 0 ? `+ ${(1500 - gFactorResult.capacity)} kW Kapazität gewonnen` : '-' }}
          </div>
        </div>
      </div>
      
      <div v-else class="flex-grow flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
        <span class="text-gray-400 text-sm">Berechnung ausstehend</span>
      </div>

    </div>
  </div>
</template>

<style>
/* Base Tailwind setup will go in index.css */
body { margin: 0; }
</style>
