const DB_NAME = 'anatomy3d_cache';
const DB_VERSION = 1;

interface CacheAsset {
  id: string;
  name: string;
  url_glb: string;
  cached_at: number;
  version?: number;
  hierarchy_updated_at?: string;
}


function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('hierarchy')) {
        db.createObjectStore('hierarchy', { keyPath: 'asset_id' });
      }
      if (!db.objectStoreNames.contains('glb_files')) {
        db.createObjectStore('glb_files', { keyPath: 'asset_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineCache = {
  async storeAsset(asset: CacheAsset): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').put(asset);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getAsset(id: string): Promise<CacheAsset | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readonly');
      const request = tx.objectStore('assets').get(id);
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  },

  async storeHierarchy(assetId: string, data: unknown[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('hierarchy', 'readwrite');
      tx.objectStore('hierarchy').put({ asset_id: assetId, data, cached_at: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getHierarchy(assetId: string): Promise<unknown[] | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('hierarchy', 'readonly');
      const request = tx.objectStore('hierarchy').get(assetId);
      request.onsuccess = () => { db.close(); resolve(request.result?.data); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  },

  async storeGlb(assetId: string, data: ArrayBuffer): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('glb_files', 'readwrite');
      tx.objectStore('glb_files').put({ asset_id: assetId, data, cached_at: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getGlb(assetId: string): Promise<ArrayBuffer | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('glb_files', 'readonly');
      const request = tx.objectStore('glb_files').get(assetId);
      request.onsuccess = () => { db.close(); resolve(request.result?.data); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  },

  async isFullyCached(assetId: string): Promise<boolean> {
    const [asset, hierarchy, glb] = await Promise.all([
      this.getAsset(assetId),
      this.getHierarchy(assetId),
      this.getGlb(assetId),
    ]);
    return !!(asset && hierarchy && glb);
  },

  async clearAsset(assetId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['assets', 'hierarchy', 'glb_files'], 'readwrite');
      tx.objectStore('assets').delete(assetId);
      tx.objectStore('hierarchy').delete(assetId);
      tx.objectStore('glb_files').delete(assetId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getCachedAssets(): Promise<CacheAsset[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readonly');
      const request = tx.objectStore('assets').getAll();
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  },

  async clearAll(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['assets', 'hierarchy', 'glb_files'], 'readwrite');
      tx.objectStore('assets').clear();
      tx.objectStore('hierarchy').clear();
      tx.objectStore('glb_files').clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },
};
