import * as THREE from 'three';

export interface ProAnatomyObject {
  id: number;
  parent_id: number | null;
  name: string;
  three_js_name: string;
  mesh?: string;
  description: string;
  // Optional extras for UI
  anatomy?: {
    type: string;
    system: string;
    side?: string;
    tags?: string[];
  };
  metadata?: {
    path?: string[];
  };
}

export interface SearchIndexItem {
  id: string;
  name: string;
  desc: string;
  system: string;
  type: string;
  keywords: string;
}

export type AnatomyDatabase = ProAnatomyObject[];

// Keep old interfaces for backward compatibility if needed
export interface AnatomyItem {
  id: number | string;
  parent_id: number | string | null;
  name: string;
  three_js_name: string;
  type: string;
  description: string;
}

export interface ExtendedMesh extends THREE.Mesh {
  userData: {
    info?: ProAnatomyObject | AnatomyItem;
  };
}

export type NameToMeshMap = Map<string, ExtendedMesh>;

// Dummy export to ensure the module is correctly recognized
export const ANATOMY_SCHEMA_VERSION = "2.0";
