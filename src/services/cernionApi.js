import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const znpService = {
  // 1. Erstelle ein Projekt (Workspace) für die Bounding Box
  async createProject(bbox) {
    const res = await api.post('/znp/projects', {
      bbox: bbox
    });
    return res.data;
  },

  // 2. Fülle Layer 0 (MaStR)
  async addLayer0(projectId, assets) {
    const res = await api.post(`/znp/projects/${projectId}/layer0`, { assets });
    return res.data;
  },

  // 3. Fülle Layer 1 (OSM Topologie & Cluster)
  async addLayer1(projectId) {
    const res = await api.post(`/znp/projects/${projectId}/layer1`);
    return res.data; // Gibt 202 Accepted + jobId zurück
  },

  // 4. Lade PDF hoch (Base64)
  async uploadDocument(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await api.post('/datasources/uploads', {
            filename: file.name,
            content: reader.result.split(',')[1], // Nur der Base64 String ohne Data-URI Prefix
            mimeType: file.type
          });
          resolve(res.data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = error => reject(error);
    });
  },

  // 5. Fülle Layer 2 (PDF Extraktion via KI)
  async addLayer2(projectId, filePath) {
    const res = await api.post(`/znp/projects/${projectId}/layer2`, { filePath });
    return res.data; // Gibt 202 Accepted + jobId zurück
  },

  // 6. Hole den g-Faktor und die angepasste Kapazität
  async getGFactor(projectId, targetLayer = 0) {
    const res = await api.get(`/znp/projects/${projectId}/g-factor?target_layer=${targetLayer}`);
    return res.data;
  },
  
  // 7. Polling der Background-Jobs
  async getJobStatus(jobId) {
    const res = await api.get(`/jobs/${jobId}/status`);
    return res.data;
  }
};
