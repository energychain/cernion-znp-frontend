<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Inhouse Intelligence (Layer 2)
          </h2>
          <p class="text-xs text-gray-500 mt-1">Dokumenten-Extraktion: {{ pdfData.docName }}</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 bg-white p-1 rounded-full hover:bg-gray-200 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto bg-white flex-grow">
          
          <div class="flex gap-4 mb-6">
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 flex-1">
                  <div class="text-xs text-gray-500 mb-1">Dateigröße</div>
                  <div class="font-semibold">{{ pdfData.fileSize }}</div>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 flex-1">
                  <div class="text-xs text-gray-500 mb-1">Upload am</div>
                  <div class="font-semibold">{{ pdfData.uploadDate }}</div>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex-1">
                  <div class="text-xs text-emerald-600 mb-1">KI Status</div>
                  <div class="font-bold text-emerald-700 flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Erfolgreich extrahiert
                  </div>
              </div>
          </div>

          <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Extrahierte Messwerte</h3>
          
          <div class="space-y-4 mb-6">
              <div v-for="metric in pdfData.metrics" :key="metric.id" class="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                      <div class="font-bold text-gray-800">{{ metric.key }}</div>
                      <div class="text-xs text-gray-500 mt-1">Quelle: <span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">{{ metric.source }}</span></div>
                      <div class="text-xs text-gray-500 mt-0.5" v-if="metric.timestamp !== '-'">Zeitstempel: {{ metric.timestamp }}</div>
                  </div>
                  <div class="text-right">
                      <div class="text-xl font-black text-blue-600">{{ metric.value }} <span class="text-sm font-normal text-gray-500">{{ metric.unit }}</span></div>
                      <div class="text-[10px] text-emerald-600 mt-1 flex items-center justify-end gap-1 font-bold">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Konfidenz: {{ metric.confidence }}
                      </div>
                  </div>
              </div>
          </div>

          <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Rohdaten Kontext (Data Lineage)</h3>
          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed relative group">
              "{{ pdfData.rawContext }}"
              <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-[10px]">
                  Seite 3 (Originaldokument)
              </div>
          </div>
          <p class="text-[10px] text-gray-400 mt-2">Dieser Textausschnitt wurde von der Cernion A²MDM Engine zur Berechnung der Werte herangezogen und als "Measurement Node" im Graphen verankert.</p>

      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pdfData: {
    type: Object,
    required: true
  }
})
defineEmits(['close'])
</script>
