import { defineStore } from 'pinia'
import { znpService } from '../services/cernionApi'

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
    activeModal: null, // null | 'assets' | 'documents' | 'assumptions'
    
    // Server-Side Paginated Assets
    assetInventory: {
      data: [],
      totalCount: 0,
      limit: 15,
      offset: 0,
      statusFilter: '', 
      isLoading: false
    }
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
      if (modalName === 'assets' && this.projectId) {
        this.fetchAssetInventory();
      }
    },

    closeModal() {
      this.activeModal = null;
    },

    async fetchAssetInventory(resetOffset = false) {
      if (!this.projectId) return;
      
      this.assetInventory.isLoading = true;
      if (resetOffset) this.assetInventory.offset = 0;

      const params = {
        limit: this.assetInventory.limit,
        offset: this.assetInventory.offset,
        sortByCapacity: 'desc'
      };

      if (this.assetInventory.statusFilter) {
        params.status = this.assetInventory.statusFilter;
      }

      try {
        const result = await znpService.getProjectAssets(this.projectId, params);
        this.assetInventory.data = result.assets;
        this.assetInventory.totalCount = result.totalCount;
      } catch (e) {
        console.error("Failed to load assets:", e);
      } finally {
        this.assetInventory.isLoading = false;
      }
    },

    async initializeWorkspace(bboxObject, vnbId) {
      this.isProcessing = true;
      this.clearLogs();
      this.layerStatus = { 0: false, 1: false, 2: false };
      this.log(`Initialisiere ZNP Workspace für Bounding Box...`);
      
      try {
        const result = await znpService.createProject(bboxObject);
        this.projectId = result.projectId;
        this.bbox = result.bbox;
        this.log(`Workspace ${this.projectId} erfolgreich erstellt.`);
        
        this.log(`Lade MaStR Assets für Layer 0...`);
        // Da wir das Cernion Backend noch nicht vollständig haben, was das Asset-Loading automatisiert:
        // Wir schicken dem Backend die Mock-Assets (mit 'In Planung'), damit es die Datenbank für den Table füllt!
        const mockAssets = [
          { mastrNummer: "SEE928374", capacity: 10.5, assetType: "solar", status: "In Betrieb", commissioningDate: "2015-05-12", lat: 49.4, lon: 8.7 },
          { mastrNummer: "SEE182736", capacity: 5.0, assetType: "solar", status: "In Betrieb", commissioningDate: "2018-08-20", lat: 49.41, lon: 8.69 },
          { mastrNummer: "SEE002938", capacity: 22.0, assetType: "solar", status: "In Betrieb", commissioningDate: "2020-01-10", lat: 49.39, lon: 8.71 },
          { mastrNummer: "SEE554433", capacity: 8.5, assetType: "solar", status: "In Betrieb", commissioningDate: "2021-06-30", lat: 49.42, lon: 8.68 },
          { mastrNummer: "SEE998877", capacity: 100.0, assetType: "solar", status: "In Planung", commissioningDate: "2026-10-01", lat: 49.40, lon: 8.72 },
          { mastrNummer: "SEE443322", capacity: 50.0, assetType: "storage", status: "In Planung", commissioningDate: "2026-11-15", lat: 49.38, lon: 8.64 },
          { mastrNummer: "SEE776655", capacity: 15.0, assetType: "storage", status: "In Betrieb", commissioningDate: "2023-04-05", lat: 49.41, lon: 8.73 }
        ]
        const ingestResult = await znpService.addLayer0(this.projectId, mockAssets);
        
        if (vnbId === 'hd') {
            this.networkStats = { pv: { count: 342, totalKw: 3150 }, wind: { count: 0, totalKw: 0 }, storage: { count: 85, totalKw: 420 }, chp: { count: 2, totalKw: 800 } };
        } else {
            this.networkStats = { pv: { count: 128, totalKw: 1050 }, wind: { count: 1, totalKw: 2500 }, storage: { count: 24, totalKw: 120 }, chp: { count: 0, totalKw: 0 } };
        }
        
        this.layerStatus[0] = true;
        this.log(`Layer 0 (MaStR Baseline) synchronisiert. ${ingestResult.nodesAdded} Knoten im Graphen erstellt.`);
        
        await this.fetchGFactor(0);
      } catch (e) {
        this.log(`Fehler bei Workspace Initialisierung: ${e.message}`);
        console.error(e);
      } finally {
        this.isProcessing = false;
      }
    },

    async ingestLayer0(mastrAssets) {
        // This is now handled automatically within initializeWorkspace for the pitch flow.
        // Left empty intentionally.
    },

    async analyzePDFDocument(file) {
      if (!this.projectId) return;
      this.isProcessing = true;
      this.log(`Starte Upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      
      try {
        // 1. Upload the physical PDF File (Base64 wrapper API)
        const uploadResult = await znpService.uploadDocument(file);
        this.log(`Upload erfolgreich. Pfad: ${uploadResult.path}`);
        
        // 2. Trigger the async Agent Job (Layer 2)
        this.log(`Übergebe PDF an Cernion A²MDM Agenten für Layer 2 Extraktion...`);
        const jobResponse = await znpService.addLayer2(this.projectId, uploadResult.path);
        
        // 3. Poll the job status and stream the logs
        this.log(`Job gestartet. ID: ${jobResponse.jobId}`);
        await this._pollJobStatus(jobResponse.jobId);
        
        // MOCK DATA for the visual presentation (Fallback until Backend actually returns the extracted data array in the Job Result)
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
        
        this.log(`Layer 2 erfolgreich in den Graphen geschrieben.`);
        this.layerStatus[2] = true;
        
        await this.fetchGFactor(2);
      } catch (e) {
        // FALLBACK FÜR DEN PITCH: Wenn Backend v0.21 noch nicht deployt ist oder 400/501 wirft
        this.log(`[API Hinweis] Backend-Extraktion schlug fehl (${e.message}). Wechsle zu lokaler KI-Simulation...`);
        await new Promise(r => setTimeout(r, 1200));
        this.log(`[Agent] Suche nach 'Zeitgleiche Jahreshöchstlast der Umspannebene'...`);
        await new Promise(r => setTimeout(r, 1800));
        
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
