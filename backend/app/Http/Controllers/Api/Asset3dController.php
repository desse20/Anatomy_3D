<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\Asset3d;
use App\Models\AnatomicalObject;

class Asset3dController extends Controller
{
    /**
     * POST /api/assets-3d/upload
     *
     * Phase 1 : Reçoit le fichier .glb (ou .zip) + JSON optionnel.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'glb_file'  => 'required|file|max:51200', // 50 MB max
            'objects'   => 'nullable|string', 
        ]);

        // S'assurer que le dossier final existe
        if (!Storage::disk('local')->exists('Assets_3D')) {
            Storage::disk('local')->makeDirectory('Assets_3D');
        }

        try {
            $file = $request->file('glb_file');
            $objectsJson = $request->input('objects', '[]');
            $objects = json_decode($objectsJson, true) ?? [];

            $filename = 'model_tmp_' . time();
            $extension = $file->getClientOriginalExtension();

            if (strtolower($extension) === 'zip') {
                $zip = new \ZipArchive;
                if ($zip->open($file->getRealPath()) === TRUE) {
                    $extractPath = storage_path('app/private/Assets_3D/tmp_' . time());
                    if (!is_dir($extractPath)) mkdir($extractPath, 0755, true);
                    
                    $zip->extractTo($extractPath);
                    $zip->close();

                    // Chercher le premier GLB dans le zip
                    $glbFileFound = null;
                    $jsonFileFound = null;
                    
                    $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($extractPath));
                    foreach ($files as $f) {
                        if (!$f->isDir()) {
                            if (strtolower($f->getExtension()) === 'glb') $glbFileFound = $f->getPathname();
                            if (strtolower($f->getExtension()) === 'json') $jsonFileFound = $f->getPathname();
                        }
                    }
                    if (!$glbFileFound) {
                        $this->rmdirRecursive($extractPath);
                        throw new \Exception(__('messages.asset_3d.no_glb'));
                    }

                    // Si on a trouvé un JSON dans le ZIP, on l'utilise
                    if ($jsonFileFound) {
                        $objects = json_decode(file_get_contents($jsonFileFound), true) ?? $objects;
                    }

                    // On déplace le GLB vers le dossier final Assets_3D
                    $finalFilename = 'model_' . time() . '.glb';
                    $finalPath = 'Assets_3D/' . $finalFilename;
                    if (!Storage::disk('local')->put($finalPath, fopen($glbFileFound, 'r'))) {
                        throw new \Exception(__('messages.asset_3d.write_error'));
                    }
                    
                    // Nettoyage complet du dossier temporaire
                    $this->rmdirRecursive($extractPath);

                    return response()->json([
                        'status'    => 'preview',
                        'tmp_path'  => $finalPath,
                        'filename'  => $finalFilename,
                        'objects'   => $objects,
                        'count'     => count($objects),
                    ]);
                } else {
                    throw new \Exception(__('messages.asset_3d.zip_error'));
                }
            }

            // Cas classique GLB direct
            $originalName = $file->getClientOriginalName();
            $pureName = pathinfo($originalName, PATHINFO_FILENAME);
            // Nettoyer le nom (enlever caracteres speciaux)
            $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $pureName);
            $finalFilename = $safeName . '.' . $extension;
            $finalPath = 'Assets_3D/' . $finalFilename;

            // Eviter les doublons de fichiers
            $counter = 1;
            while (Storage::disk('local')->exists($finalPath)) {
                $finalFilename = $safeName . '_' . $counter . '.' . $extension;
                $finalPath = 'Assets_3D/' . $finalFilename;
                $counter++;
            }

            if (!Storage::disk('local')->putFileAs('Assets_3D', $file, $finalFilename)) {
                throw new \Exception(__('messages.asset_3d.write_error'));
            }

            return response()->json([
                'status'    => 'preview',
                'tmp_path'  => $finalPath,
                'filename'  => $finalFilename,
                'objects'   => $objects,
                'count'     => count($objects),
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/assets-3d/scan
     * Liste les fichiers présents dans le dossier Assets_3D (pour import local)
     */
    public function scanLocalFolder()
    {
        try {
            $path = storage_path('app/private/Assets_3D');
            if (!is_dir($path)) {
                return response()->json([], 200);
            }

            // Utilisation de glob pour être ultra-rapide et stable
            $files = glob($path . '/*.{glb,zip,GLB,ZIP}', GLOB_BRACE);
            $result = [];
            foreach ($files as $file) {
                $basename = basename($file);
                // Ne pas montrer les fichiers de travail temporaires
                if (str_starts_with($basename, 'model_') || str_starts_with($basename, 'tmp_')) continue;
                
                $result[] = 'Assets_3D/' . $basename;
            }

            return response()->json($result, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/assets-3d/process-local
     * Prend un fichier déjà sur le serveur et lance l'analyse (comme un upload)
     */
    public function processLocalFile(Request $request)
    {
        try {
            $filename = $request->input('filename');

            if (!$filename || !Storage::disk('local')->exists($filename)) {
                throw new \Exception(__('messages.asset_3d.not_found', ['filename' => $filename]));
            }

            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

            // Archive ZIP
            if ($ext === 'zip') {
                $zipPath = storage_path('app/private/' . $filename);
                $extractTo = 'Assets_3D/tmp_' . time();
                $fullExtractTo = storage_path('app/private/' . $extractTo);
                if (!is_dir($fullExtractTo)) mkdir($fullExtractTo, 0777, true);

                $zip = new \ZipArchive;
                if ($zip->open($zipPath) === TRUE) {
                    $zip->extractTo($fullExtractTo);
                    $zip->close();
                    
                    $files = $this->getDirContents($fullExtractTo);
                    $glbFile = null; $jsonFile = null;
                    foreach ($files as $f) {
                        if (str_ends_with(strtolower($f), '.glb')) $glbFile = $f;
                        if (str_ends_with(strtolower($f), '.json')) $jsonFile = $f;
                    }
                    if (!$glbFile) throw new \Exception(__('messages.asset_3d.no_glb'));

                    $objects = [];
                    if ($jsonFile) {
                        $objects = json_decode(file_get_contents($jsonFile), true) ?? [];
                        if (isset($objects['objects'])) $objects = $objects['objects'];
                    }

                    $finalFilename = 'tmp_' . time() . '.glb';
                    $finalPath = 'Assets_3D/' . $finalFilename;
                    Storage::disk('local')->copy(str_replace(storage_path('app/private/'), '', $glbFile), $finalPath);

                    return response()->json([
                        'status' => 'preview', 'tmp_path' => $finalPath, 'filename' => $finalFilename, 'objects' => $objects, 'count' => count($objects)
                    ]);
                }
            }

            // GLB Direct
            $objects = [];
            $fullPath = storage_path('app/private/' . $filename);
            if (file_exists($fullPath)) {
                $objects = $this->extractGlbMetadata($fullPath);
            }

            return response()->json([
                'status' => 'preview', 
                'tmp_path' => $filename, 
                'filename' => basename($filename), 
                'objects' => $objects, 
                'count' => count($objects)
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Extrait les noms des nœuds et des meshes d'un fichier GLB (v2)
     */
    private function extractGlbMetadata($path)
    {
        try {
            $handle = fopen($path, 'rb');
            if (!$handle) return [];

            // Header (12 bytes): magic(4), version(4), length(4)
            $header = fread($handle, 12);
            $magic = substr($header, 0, 4);
            if ($magic !== 'glTF') return [];

            // Chunk 0: length(4), type(4), data(length)
            $chunkHeader = fread($handle, 8);
            if (strlen($chunkHeader) < 8) return [];
            
            $chunkLength = unpack('V', substr($chunkHeader, 0, 4))[1];
            $chunkType = substr($chunkHeader, 4, 4);

            if ($chunkType !== 'JSON') return [];

            $jsonData = fread($handle, $chunkLength);
            fclose($handle);

            $gltf = json_decode($jsonData, true);
            $objects = [];

            if (isset($gltf['nodes'])) {
                foreach ($gltf['nodes'] as $index => $node) {
                    if (isset($node['name']) && !empty($node['name'])) {
                        // On ignore les noms génériques ou vides
                        if (in_array(strtolower($node['name']), ['scene', 'root', 'camera', 'sun', 'lamp'])) continue;
                        
                        $objects[] = [
                            'id' => count($objects) + 1, // ID séquentiel simple (1, 2, 3...)
                            'name' => str_replace(['_', '.'], ' ', $node['name']),
                            'three_js_name' => $node['name'],
                            'mesh' => $node['name'],
                            'description' => 'Objet détecté automatiquement'
                        ];
                    }
                }
            }

            return $objects;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * GET /api/models-manager
     * Liste tous les assets 3D disponibles
     */
    public function index()
    {
        $assets = Asset3d::with('admin:id,firstname,lastname')
            ->withCount('anatomicalObjects')
            ->latest()
            ->get()
            ->map(fn($a) => [
                'id'          => $a->id,
                'name'        => $a->name,
                'url_glb'     => $a->url_glb,
                'version'     => $a->version_cache,
                'objects'     => $a->anatomical_objects_count,
                'uploaded_by' => $a->admin ? $a->admin->firstname . ' ' . $a->admin->lastname : 'Admin',
                'created_at'  => $a->created_at,
            ]);

        return response()->json($assets);
    }

    /**
     * GET /api/models-manager/{asset}
     */
    public function show(Asset3d $asset)
    {
        // On retourne l'asset avec la première page d'objets (20 par défaut)
        $asset->objects_paginated = $asset->anatomicalObjects()->paginate(20);
        return response()->json($asset);
    }

    /**
     * GET /api/models-manager/{asset}/objects-paginated
     */
    public function getObjectsPaginated(Asset3d $asset)
    {
        return response()->json($asset->anatomicalObjects()->paginate(20));
    }

    public function update(Request $request, Asset3d $asset)
    {
        $newName = $request->input('name');
        if (!$newName) {
            return response()->json(['error' => 'Le nom est requis'], 422);
        }

        try {
            // Mettre à jour le NOM réel en base (avec accents, etc.)
            $asset->name = $newName;

            $oldPath = $asset->url_glb;
            $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
            
            // Slugifier le nom pour le fichier PHYSIQUE (sans accents pour le web)
            $slug = \Illuminate\Support\Str::slug($newName, '_');
            $newFilename = $slug . '.' . $extension;
            $newPath = 'Assets_3D/' . $newFilename;

            // Verifier si le fichier existe deja (different de l'actuel)
            if ($newPath !== $oldPath && Storage::disk('local')->exists($newPath)) {
                $counter = 1;
                while (Storage::disk('local')->exists('Assets_3D/' . $slug . '_' . $counter . '.' . $extension)) {
                    $counter++;
                }
                $newFilename = $slug . '_' . $counter . '.' . $extension;
                $newPath = 'Assets_3D/' . $newFilename;
            }

            // Renommer physiquement le fichier
            if ($newPath !== $oldPath) {
                if (!Storage::disk('local')->move($oldPath, $newPath)) {
                    throw new \Exception("Impossible de renommer le fichier sur le disque.");
                }
                $asset->url_glb = $newPath;
            }
            
            $asset->save();

            return response()->json([
                'message' => 'Modèle renommé avec succès',
                'asset'   => $asset
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Asset3d $asset)
    {
        $request->validate(['password' => 'required|string']);

        $user = $request->user();
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => __('messages.asset_3d.wrong_password')], 403);
        }

        $asset->anatomicalObjects()->delete();

        // Supprimer le fichier GLB du disque
        if ($asset->url_glb && Storage::disk('local')->exists($asset->url_glb)) {
            Storage::disk('local')->delete($asset->url_glb);
        }

        $asset->delete();
        return response()->json(['message' => __('messages.asset_3d.deleted')]);
    }

    public function updateObject(Request $request, AnatomicalObject $object)
    {
        $object->update($request->only(['name', 'three_js_name', 'mesh', 'description', 'parent_id']));
        return response()->json(['message' => __('messages.asset_3d.object_updated'), 'object' => $object]);
    }

    public function destroyObject(AnatomicalObject $object)
    {
        $object->delete();
        return response()->json(['message' => __('messages.asset_3d.object_deleted')]);
    }

    public function addObject(Request $request, Asset3d $asset)
    {
        $data = $request->only(['name', 'three_js_name', 'mesh', 'description', 'parent_id']);
        
        // Comme incrementing = false, on doit generer un ID si non fourni
        if (!isset($data['id'])) {
            $data['id'] = (int)round(microtime(true) * 1000);
        }
        
        $object = $asset->anatomicalObjects()->create($data);
        return response()->json(['message' => __('messages.asset_3d.object_added'), 'object' => $object]);
    }

    /**
     * Importe massivement des objets depuis un fichier JSON.
     */
    public function importHierarchy(Request $request, Asset3d $asset)
    {
        $json = null;
        if ($request->hasFile('json_file')) {
            $json = json_decode(file_get_contents($request->file('json_file')->getRealPath()), true);
        } elseif ($request->input('use_default')) {
            $path = storage_path('app/anatomy_hierarchy.json');
            if (file_exists($path)) {
                $json = json_decode(file_get_contents($path), true);
            }
        } elseif ($request->has('objects') || $request->isJson()) {
            $json = $request->input('objects') ?? $request->json()->all();
        }

        if (!$json) {
            return response()->json(['error' => __('messages.asset_3d.no_json')], 422);
        }

        if ($request->input('preview')) {
            return response()->json(['data' => $json]);
        }

        // Si le JSON est enveloppé dans une clé "objects"
        if (isset($json['objects'])) $json = $json['objects'];

        // Normaliser : si le JSON est un objet {id: {...}} plutôt qu'un tableau [{id, ...}]
        // (cas où le front envoie un objet JS indexé par ID)
        if (!empty($json) && !isset(array_values($json)[0]['id'])) {
            $normalized = [];
            foreach ($json as $id => $item) {
                $item['id'] = $id;
                $normalized[] = $item;
            }
            $json = $normalized;
        }

        return DB::transaction(function() use ($json, $asset, $request) {
            $count = 0;
            
            // Désactiver les vérifications de clés étrangères (comme dans le seeder)
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            
            // Dernier ID global en base (pas seulement pour cet asset)
            // pour garantir l'unicité et éviter les collisions
            $lastId = AnatomicalObject::max('id') ?? 0;
            
            foreach ($json as $obj) {
                if (!isset($obj['id'])) {
                    continue;
                }

                // Nouvel ID = dernier ID de la base + ID du JSON (petit entier séquentiel)
                $newId = $lastId + (int)$obj['id'];
                // Nouveau parent_id = dernier ID de la base + parent_id du JSON
                $newParentId = (isset($obj['parent_id']) && $obj['parent_id'] !== null)
                    ? ($lastId + (int)$obj['parent_id'])
                    : null;

                AnatomicalObject::updateOrCreate(
                    ['id' => $newId],
                    [
                        'parent_id'     => $newParentId,
                        'asset_3d_id'   => $asset->id,
                        'name'          => $obj['name'] ?? 'Objet sans nom',
                        'three_js_name' => $obj['three_js_name'] ?? ($obj['name'] ?? 'Object'),
                        'mesh'          => $obj['mesh'] ?? ($obj['three_js_name'] ?? null),
                        'description'   => $obj['description'] ?? null,
                    ]
                );
                $count++;
            }

            // Réactiver les vérifications de clés étrangères
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            // Mettre à jour la version si fournie
            if ($version = $request->input('version_cache')) {
                $asset->update(['version_cache' => (int)$version]);
            }

            return response()->json([
                'message' => __('messages.asset_3d.import_success', ['count' => $count]),
                'count'   => $count,
                'version_cache' => $asset->fresh()->version_cache
            ]);
        });
    }

    /**
     * Recherche des objets au sein d'un actif (pour sélection de parent).
     */
    public function searchObjects(Request $request, Asset3d $asset)
    {
        $query = $request->input('query');
        $objects = $asset->anatomicalObjects()
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%$query%")
                  ->orWhere('id', 'like', "%$query%")
                  ->orWhere('three_js_name', 'like', "%$query%");
            })
            ->limit(10)
            ->get();

        return response()->json($objects);
    }

    /**
     * POST /api/models-manager/confirm
     */
    public function confirm(Request $request)
    {
        try {
            $tmpPath = $request->input('tmp_path');
            $objects = $request->input('objects', []);
            $user    = $request->user();

            if (!$tmpPath || !Storage::disk('local')->exists($tmpPath)) {
                throw new \Exception(__('messages.asset_3d.not_found', ['filename' => 'temp']));
            }

            return DB::transaction(function () use ($tmpPath, $objects, $user, $request) {
                // Créer un nouveau nom de fichier basé sur le nom fourni par l'utilisateur
                $customName = $request->input('name', 'Model');
                $slug = str_replace(' ', '_', strtolower($customName));
                $newFileName = 'Assets_3D/' . $slug . '_' . time() . '.glb';

                // Déplacer/Renommer le fichier physique
                if (Storage::disk('local')->exists($tmpPath)) {
                    Storage::disk('local')->move($tmpPath, $newFileName);
                }

                // Trouver un admin par défaut si non connecté (mode debug)
                $adminId = $user ? $user->id : \App\Models\User::where('role', 'admin')->first()?->id;

                // Créer l'Asset3D
                $asset = Asset3d::create([
                    'name'          => $customName,
                    'url_glb'       => $newFileName,
                    'version_cache' => 1,
                    'admin_id'      => $adminId,
                ]);

                // Créer les AnatomicalObjects associés
                // Désactiver les vérifications de clés étrangères (comme dans le seeder)
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                
                // Dernier ID global en base pour garantir l'unicité
                $lastId = AnatomicalObject::max('id') ?? 0;

                // Normaliser si le JSON est un objet {id: {...}} plûtot qu'un tableau [{id,...}]
                if (!empty($objects) && !isset(array_values($objects)[0]['id'])) {
                    $normalized = [];
                    foreach ($objects as $id => $item) {
                        $item['id'] = $id;
                        $normalized[] = $item;
                    }
                    $objects = $normalized;
                }
                
                foreach ($objects as $obj) {
                    if (!isset($obj['id'])) {
                        continue;
                    }

                    // Nouvel ID = dernier ID global + ID séquentiel du JSON
                    $newId = $lastId + (int)$obj['id'];
                    // Nouveau parent_id = dernier ID global + parent_id du JSON
                    $newParentId = (isset($obj['parent_id']) && $obj['parent_id'] !== null)
                        ? ($lastId + (int)$obj['parent_id'])
                        : null;

                    AnatomicalObject::create([
                        'id'            => $newId,
                        'parent_id'     => $newParentId,
                        'asset_3d_id'   => $asset->id,
                        'name'          => $obj['name'] ?? 'Inconnu',
                        'three_js_name' => $obj['three_js_name'] ?? ($obj['name'] ?? 'Object'),
                        'mesh'          => $obj['mesh'] ?? null,
                        'description'   => $obj['description'] ?? null,
                    ]);
                }

                // Réactiver les vérifications de clés étrangères
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');

                return response()->json([
                    'status'  => 'success',
                    'message' => 'Importation réussie !',
                    'asset'   => $asset->load('anatomicalObjects'),
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/models-manager/{asset}/offline-package
     * Télécharge un ZIP autonome pour consultation hors-ligne.
     * Le GLB est encodé en base64 et chargé via <script> (seule méthode
     * fiable depuis file:// dans Chrome — XHR et fetch y sont bloqués).
     */
    public function offlinePackage(Asset3d $asset)
    {
        try {
            $objects = $asset->anatomicalObjects()
                ->orderBy('id')
                ->get(['id', 'parent_id', 'name', 'three_js_name', 'description']);

            $glbPath = $asset->url_glb;
            if (!$glbPath || !Storage::disk('local')->exists($glbPath)) {
                return response()->json(['error' => 'Fichier GLB introuvable pour cet asset'], 404);
            }

            // Bundle Three.js non-module
            $threeBundle = $this->generateThreeBundle();

            // GLB encodé en base64 pour chargement via <script> (pas de XHR/fetch)
            $glbFullPath = Storage::disk('local')->path($glbPath);
            $glbBase64 = base64_encode(file_get_contents($glbFullPath));
            $glbJs = "// GLB model (base64)\nvar GLB_BASE64 = " . json_encode($glbBase64) . ";\n";

            // Hiérarchie encodée pour inline safe
            $hierarchyJson = json_encode(
                $objects->toArray(),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
            );

            $html = view('offline-viewer', [
                'name'          => $asset->name,
                'lang'          => request()->input('lang', app()->getLocale()),
                'hierarchyJson' => $hierarchyJson,
            ])->render();

            $zipPath = tempnam(sys_get_temp_dir(), 'offline_') . '.zip';
            $zip = new \ZipArchive();
            if ($zip->open($zipPath, \ZipArchive::CREATE) !== true) {
                throw new \Exception("Impossible de créer l'archive ZIP");
            }

            $zip->addFromString('index.html', $html);
            $zip->addFromString('three-bundle.js', $threeBundle);
            $zip->addFromString('model.glb.js', $glbJs);
            $zip->addFromString('hierarchy.json', json_encode(
                $objects->toArray(),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
            ));

            $zip->close();

            return response()->download($zipPath, $asset->name . '_offline.zip')
                ->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Génère un bundle JavaScript non-module contenant Three.js + OrbitControls + GLTFLoader.
     * Compatible file:// dans tous les navigateurs (pas d'ES modules, pas de fetch).
     */
    private function generateThreeBundle(): string
    {
        $threeDir = resource_path('three-offline');

        // === Three.js core (CommonJS build transformé en IIFE) ===
        $cjsCode = file_get_contents($threeDir . '/three.cjs');
        $bundle = "// Three.js offline bundle (non-module)\n";
        $bundle .= "var THREE = {};\n";
        $bundle .= "(function(exports) {\n";
        $bundle .= $cjsCode . "\n";
        $bundle .= "})(THREE);\n\n";

        // === Extraire les imports des deux fichiers et les fusionner ===
        // (évite les conflits "const déjà déclaré" quand OrbitControls et GLTFLoader
        //  importent les mêmes noms depuis 'three')
        $orbitCode = file_get_contents($threeDir . '/addons/controls/OrbitControls.js');
        $gltfCode = file_get_contents($threeDir . '/addons/loaders/GLTFLoader.js');

        // Collecter tous les noms importés depuis 'three'
        $allImports = [];
        foreach ([$orbitCode, $gltfCode] as $code) {
            if (preg_match('/import\s*\{([^}]+)\}\s*from\s*\'three\';/s', $code, $m)) {
                $names = array_map('trim', explode(',', $m[1]));
                $allImports = array_merge($allImports, $names);
            }
        }
        $allImports = array_unique($allImports);
        $importsStr = implode(",\n\t", $allImports);

        // Supprimer les lignes d'import 'three' des deux fichiers
        $orbitCode = preg_replace('/import\s*\{[^}]+\}\s*from\s*\'three\';\n?/s', '', $orbitCode);
        $orbitCode = preg_replace('/\nexport\s*\{([^}]+)\};/s', '', $orbitCode);

        $gltfCode = preg_replace('/import\s*\{[^}]+\}\s*from\s*\'three\';\n?/s', '', $gltfCode);
        // Supprimer les imports relatifs (BufferGeometryUtils, SkeletonUtils)
        $gltfCode = preg_replace('/import\s*\{[^}]+\}\s*from\s*\'[^\']+\';\n?/s', '', $gltfCode);
        $gltfCode = preg_replace('/\nexport\s*\{([^}]+)\};/s', '', $gltfCode);

        // === Écrire le bundle avec un seul const des imports partagés ===
        $bundle .= "// Shared imports from THREE\n";
        $bundle .= "const {\n\t" . $importsStr . "\n} = THREE;\n\n";
        $bundle .= "// OrbitControls\n" . $orbitCode . "\n\n";
        $bundle .= "// GLTFLoader\n" . $gltfCode . "\n\n";

        // Stubs pour les utilitaires addon manquants
        $bundle .= "// Stubs for missing addon utils\n";
        $bundle .= "function toTrianglesDrawMode(geometry, drawMode) {\n";
        $bundle .= "  return geometry;\n";
        $bundle .= "}\n";
        $bundle .= "function clone(obj) {\n";
        $bundle .= "  return obj.clone();\n";
        $bundle .= "}\n";

        return $bundle;
    }

    /**
     * Supprime un dossier et tout son contenu récursivement.
     */
    private function rmdirRecursive($dir) {
        if (!is_dir($dir)) return;
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            (is_dir("$dir/$file")) ? $this->rmdirRecursive("$dir/$file") : unlink("$dir/$file");
        }
    }

    /**
     * Sert un fichier GLB depuis le stockage local (private).
     */
    public function serveFile($filename)
    {
        $path = 'Assets_3D/' . $filename;
        if (!Storage::disk('local')->exists($path)) {
            abort(404, "Fichier non trouvé");
        }

        $file = Storage::disk('local')->get($path);
        return response($file, 200)
            ->header('Content-Type', 'model/gltf-binary')
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function getDirContents($dir, &$results = array()) {
        $files = scandir($dir);
        foreach ($files as $value) {
            $path = $dir . DIRECTORY_SEPARATOR . $value;
            if (!is_dir($path)) {
                $results[] = $path;
            } else if ($value != "." && $value != "..") {
                $this->getDirContents($path, $results);
            }
        }
        return $results;
    }
}
