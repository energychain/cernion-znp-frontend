<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            MaStR Asset Inventar (Layer 0)
          </h2>
          <p class="text-xs text-gray-500 mt-1">Live-Daten aus dem Cernion Graphenspeicher für dieses Netzgebiet.</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 bg-white p-1 rounded-full hover:bg-gray-200 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Toolbar / Filters -->
      <div class="px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
        <div class="flex gap-2">
            <button 
              @click="setFilter('')" 
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
              :class="znpStore.assetInventory.statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Alle Anlagen ({{ znpStore.assetInventory.statusFilter === '' ? znpStore.assetInventory.totalCount : '...' }})
            </button>
            <button 
              @click="setFilter('In Planung')" 
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors border"
              :class="znpStore.assetInventory.statusFilter === 'In Planung' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'"
            >
              Status: In Planung
            </button>
        </div>
        <div class="text-xs text-gray-400 flex items-center gap-1">
            <svg v-if="znpStore.assetInventory.isLoading" class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span v-if="znpStore.assetInventory.isLoading">Lade Daten aus Backend...</span>
            <span v-else>Live Verbindung aktiv</span>
        </div>
      </div>

      <!-- Table Body -->
      <div class="overflow-auto bg-white flex-grow relative min-h-[300px]">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">MaStR Nummer</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Typ</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Leistung (kW) <span class="text-blue-500 ml-1">↓</span>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inbetriebnahme</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200" :class="{'opacity-40': znpStore.assetInventory.isLoading}">
            <tr v-for="asset in znpStore.assetInventory.data" :key="asset.mastrNummer" class="hover:bg-blue-50 transition-colors" :class="{'bg-red-50/30': asset.status === 'In Planung'}">
              <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">{{ asset.mastrNummer }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                    <span v-if="asset.assetType === 'storage'" class="text-purple-600">🔋</span>
                    <span v-else-if="asset.assetType === 'solar'" class="text-yellow-500">☀️</span>
                    <span v-else-if="asset.assetType === 'wind'" class="text-blue-400">🌬️</span>
                    <span class="capitalize font-medium text-gray-700">{{ asset.assetType }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold" :class="asset.capacity >= 100 ? 'text-red-600' : 'text-gray-900'">
                {{ asset.capacity.toLocaleString('de-DE') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span v-if="asset.status === 'In Betrieb'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">In Betrieb</span>
                <span v-else class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">{{ asset.status || 'Unbekannt' }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ asset.commissioningDate || '-' }}</td>
            </tr>
            <tr v-if="znpStore.assetInventory.data.length === 0 && !znpStore.assetInventory.isLoading">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400 italic">Keine Anlagen für diesen Filter gefunden.</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Footer (Pagination) -->
      <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
        <span>
          Zeige {{ Math.min((znpStore.assetInventory.offset) + 1, znpStore.assetInventory.totalCount) }} 
          bis {{ Math.min(znpStore.assetInventory.offset + znpStore.assetInventory.limit, znpStore.assetInventory.totalCount) }} 
          von {{ znpStore.assetInventory.totalCount }} Einträgen
        </span>
        <div class="flex gap-1">
            <button 
              @click="prevPage" 
              :disabled="znpStore.assetInventory.offset === 0 || znpStore.assetInventory.isLoading"
              class="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              Zurück
            </button>
            <button 
              @click="nextPage" 
              :disabled="(znpStore.assetInventory.offset + znpStore.assetInventory.limit) >= znpStore.assetInventory.totalCount || znpStore.assetInventory.isLoading"
              class="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              Weiter
            </button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { useZnpStore } from '../store/znpStore'
const znpStore = useZnpStore()

const emit = defineEmits(['close'])

const setFilter = (status) => {
  znpStore.assetInventory.statusFilter = status;
  znpStore.fetchAssetInventory(true); // Reset offset to 0 on new filter
}

const nextPage = () => {
  znpStore.assetInventory.offset += znpStore.assetInventory.limit;
  znpStore.fetchAssetInventory();
}

const prevPage = () => {
  znpStore.assetInventory.offset = Math.max(0, znpStore.assetInventory.offset - znpStore.assetInventory.limit);
  znpStore.fetchAssetInventory();
}
</script>
