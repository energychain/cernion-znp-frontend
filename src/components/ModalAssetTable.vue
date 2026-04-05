<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            MaStR Asset Inventar (Layer 0)
          </h2>
          <p class="text-xs text-gray-500 mt-1">Detaillierte Ansicht aller physischen Anlagen im selektierten Netzgebiet.</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 bg-white p-1 rounded-full hover:bg-gray-200 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Toolbar / Filters -->
      <div class="px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
        <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Alle Anlagen ({{assets.length}})
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Status: In Planung ({{ assets.filter(a => a.status === 'In Planung').length }})
            </span>
        </div>
        <div class="text-xs text-gray-400 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filter & Suche aktiv
        </div>
      </div>

      <!-- Table Body -->
      <div class="overflow-auto bg-white flex-grow">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">MaStR Nummer</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Typ</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider group cursor-pointer hover:bg-gray-100">
                Leistung (kW) <span class="text-blue-500 ml-1">↓</span>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inbetriebnahme</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="asset in assets" :key="asset.mastrNummer" class="hover:bg-blue-50 transition-colors" :class="{'bg-red-50/30': asset.status === 'In Planung'}">
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
                <span v-else class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">{{ asset.status }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ asset.commissioningDate }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
        <span>Zeige 1 bis {{assets.length}} von {{assets.length}} Einträgen</span>
        <div class="flex gap-1">
            <button class="px-3 py-1 border border-gray-300 rounded bg-white text-gray-400 cursor-not-allowed">Zurück</button>
            <button class="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-700">Weiter</button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
defineProps({
  assets: {
    type: Array,
    required: true
  }
})
defineEmits(['close'])
</script>
