import * as THREE from 'three';

export interface AnatomyItem {
  id: number;
  parent_id: number | null;
  name: string;
  three_js_name: string;
  type: 'mesh' | 'group' | 'bone';
  description: string;
}

export interface ExtendedMesh extends THREE.Mesh {
  userData: {
    info?: AnatomyItem;
  };
}

export type NameToMeshMap = Map<string, ExtendedMesh>;
