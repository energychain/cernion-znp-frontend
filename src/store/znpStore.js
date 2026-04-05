import { defineStore } from 'pinia'

export const useZnpStore = defineStore('znp', {
  state: () => ({
    projectId: null,
    bbox: null,
    assets: [], 
    gFactorResult: null, 
    currentLayer: 0,
    isProcessing: false,
    logMessages: [], 
    layerStatus: { 0: false, 1: false, 2: false },
    
    // Belohnungs-UI State (Extracted Data)
    networkStats: null,
    extractedPdfData: null,
    strategicAssumptions: [],

    // Modal State Control
    activeModal: null // null | 'assets' | 'documents' | 'assumptions'
  }),

  actions: {
    log(msg) {
      if (!this.logMessages.some(l => l.msg === msg)) {
        this.logMessages.push({ time: new Date().toLocaleTimeString(), msg });
      }
    },
    
    clearLogs() {
      this.logMessages = [];
      this.networkStats = null;
      this.extractedPdfData = null;
      this.strategicAssumptions = [];
      this.activeModal = null;
    },

    openModal(modalName) {
      this.activeModal = modalName;
    },

    closeModal() {
      this.activeModal = null;
    },

    async initializeWorkspace(bboxObject, vnbId) {
      this.isProcessing = true;
      this.clearLogs();
      this.layerStatus = { 0: false, 1: false, 2: false };
      this.log(`Initialisiere ZNP Workspace für Bounding Box...`);
      
      try {
        await new Promise(r => setTimeout(r, 600));
        this.projectId = 'mock-uuid-' + Date.now();
        this.log(`Workspace ${this.projectId} erfolgreich erstellt.`);
        
        this.log(`Lade MaStR Assets für Layer 0...`);
        await new Promise(r => setTimeout(r, 800));
        
        if (vnbId === 'hd') {
            this.networkStats = {
                pv: { count: 342, totalKw: 3150, avgKw: 9.2 },
                wind: { count: 0, totalKw: 0 },
                storage: { count: 85, totalKw: 420 },
                chp: { count: 2, totalKw: 800 }
            };
        } else {
            this.networkStats = {
                pv: { count: 128, totalKw: 1050, avgKw: 8.2 },
                wind: { count: 1, totalKw: 2500 },
                storage: { count: 24, totalKw: 120 },
                chp: { count: 0, totalKw: 0 }
            };
        }
        
        this.layerStatus[0] = true;
        this.log(`Layer 0 (MaStR Baseline) synchronisiert. ${this.networkStats.pv.count + this.networkStats.wind.count + this.networkStats.storage.count} Knoten erstellt.`);
        
        this.currentLayer = 0;
        this.gFactorResult = { capacity: 1500, simultaneityFactor: 1.0 };
        
      } catch (e) {
        this.log(`Fehler bei Workspace Initialisierung: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    },

    async ingestLayer0(mastrAssets) {
        // Safe the extended mock assets for the modal table
        this.assets = mastrAssets;
    },

    async analyzePDFDocument(file) {
      this.isProcessing = true;
      this.log(`Starte Upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      
      try {
        await new Promise(r => setTimeout(r, 1200));
        this.log(`[Agent] Suche nach 'Zeitgleiche Jahreshöchstlast der Umspannebene'...`);
        await new Promise(r => setTimeout(r, 1800));
        
        // Extended PDF Data for the Document Modal View
        this.extractedPdfData = {
            docName: file.name,
            fileSize: (file.size / 1024).toFixed(1) + ' KB',
            uploadDate: new Date().toLocaleString(),
            status: "Success",
            metrics: [
                { id: 1, key: "Jahreshöchstlast (Einspeisung)", value: 650, unit: "kW", timestamp: "14.07.2025 13:15", source: "Seite 3, Abs. 2", confidence: "High (98%)" },
                { id: 2, key: "Jahreshöchstlast (Entnahme)", value: 420, unit: "kW", timestamp: "12.01.2025 18:30", source: "Seite 3, Abs. 3", confidence: "High (95%)" },
                { id: 3, key: "Trafos auf Netzebene 6", value: 12, unit: "Stück", timestamp: "-", source: "Tabelle 4.1", confidence: "High (100%)" }
            ],
            rawContext: "Die höchste zeitgleiche Einspeisung aller an das Netz der allgemeinen Versorgung angeschlossenen Anlagen der Umspannebene betrug am 14. Juli 2025 um 13:15 Uhr exakt 650 kW."
        };
        
        this.log(`[Agent] Wert gefunden: 650 kW (Eingespeist) am Trafo.`);
        this.log(`Schreibe Measurement Node in Layer 2 des Graphen...`);
        
        this.layerStatus[2] = true;
        this.currentLayer = 2;
        this.gFactorResult = { capacity: 650, simultaneityFactor: 0.43 };
        this.log(`Berechnung abgeschlossen. g-Faktor: 0.43`);
        
      } catch (e) {
        this.log(`Fehler bei Layer 2 Verarbeitung: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    },
    
    async addStrategicAssumption(text) {
        this.isProcessing = true;
        this.log(`[Agent] Analysiere Planer-Eingabe...`);
        
        try {
            await new Promise(r => setTimeout(r, 1500));
            
            const newAssumption = {
                id: Date.now(),
                type: "Batteriegroßspeicher",
                capacityKw: 5000,
                location: "Brückweg",
                hasFlexibleNav: text.toLowerCase().includes("flexibel") || text.toLowerCase().includes("nav"),
                gFactorAppplied: 0.0,
                rawInput: text
            };
            
            if (!newAssumption.hasFlexibleNav) {
                newAssumption.gFactorAppplied = 1.0; 
            }
            
            this.strategicAssumptions.push(newAssumption);
            
            this.log(`[Agent] Asset '${newAssumption.type}' (${newAssumption.capacityKw} kW) extrahiert. Flexibler NAV: ${newAssumption.hasFlexibleNav ? 'Ja (g=0.0)' : 'Nein (g=1.0)'}.`);
            this.log(`Schreibe 'StrategicAssumption' Node in den Graphen...`);
            
        } finally {
            this.isProcessing = false;
        }
    },

    setTargetLayer(layer) {
        this.currentLayer = layer;
        if (layer === 0) this.gFactorResult = { capacity: 1500, simultaneityFactor: 1.0 };
        else if (layer === 1) this.gFactorResult = { capacity: 1100, simultaneityFactor: 0.73 };
        else if (layer === 2) this.gFactorResult = { capacity: 650, simultaneityFactor: 0.43 };
    }
  }
})
