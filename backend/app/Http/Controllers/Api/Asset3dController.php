<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                        throw new \Exception("Aucun fichier .glb trouvé dans l'archive ZIP.");
                    }

                    // Si on a trouvé un JSON dans le ZIP, on l'utilise
                    if ($jsonFileFound) {
                        $objects = json_decode(file_get_contents($jsonFileFound), true) ?? $objects;
                    }

                    // On déplace le GLB vers le dossier final Assets_3D
                    $finalFilename = 'model_' . time() . '.glb';
                    $finalPath = 'Assets_3D/' . $finalFilename;
                    if (!Storage::disk('local')->put($finalPath, fopen($glbFileFound, 'r'))) {
                        throw new \Exception("Échec de l'écriture du fichier GLB sur le disque local.");
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
                    throw new \Exception("Impossible d'ouvrir l'archive ZIP.");
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
                throw new \Exception("Échec du téléversement du fichier sur le disque local.");
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
                throw new \Exception("Le fichier $filename est introuvable.");
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
                    if (!$glbFile) throw new \Exception("Pas de .glb dans le ZIP.");

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
                            'id' => (int)$index + time(), // ID temporaire
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

    public function destroy(Asset3d $asset)
    {
        $asset->anatomicalObjects()->delete();
        $asset->delete();
        return response()->json(['message' => 'Modèle supprimé avec succès']);
    }

    public function updateObject(Request $request, AnatomicalObject $object)
    {
        $object->update($request->only(['name', 'three_js_name', 'mesh', 'description', 'parent_id']));
        return response()->json(['message' => 'Objet mis à jour', 'object' => $object]);
    }

    public function destroyObject(AnatomicalObject $object)
    {
        $object->delete();
        return response()->json(['message' => 'Objet supprimé']);
    }

    public function addObject(Request $request, Asset3d $asset)
    {
        $data = $request->only(['name', 'three_js_name', 'mesh', 'description', 'parent_id']);
        
        // Comme incrementing = false, on doit generer un ID si non fourni
        if (!isset($data['id'])) {
            $data['id'] = (int)round(microtime(true) * 1000);
        }
        
        $object = $asset->anatomicalObjects()->create($data);
        return response()->json(['message' => 'Objet ajouté', 'object' => $object]);
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
            return response()->json(['error' => 'Aucune donnée JSON valide fournie'], 422);
        }

        if ($request->input('preview')) {
            return response()->json(['data' => $json]);
        }

        // Si le JSON est enveloppé dans une clé "objects"
        if (isset($json['objects'])) $json = $json['objects'];

        return DB::transaction(function() use ($json, $asset) {
            $count = 0;
            foreach ($json as $obj) {
                AnatomicalObject::updateOrCreate(
                    ['id' => $obj['id'] ?? (int)round(microtime(true) * 1000)],
                    [
                        'asset_3d_id'   => $asset->id,
                        'parent_id'     => $obj['parent_id'] ?? null,
                        'name'          => $obj['name'] ?? 'Objet sans nom',
                        'three_js_name' => $obj['three_js_name'] ?? ($obj['name'] ?? 'Object'),
                        'mesh'          => $obj['mesh'] ?? ($obj['three_js_name'] ?? null),
                        'description'   => $obj['description'] ?? null,
                    ]
                );
                $count++;
            }

            return response()->json([
                'message' => "$count objets importés avec succès",
                'count'   => $count
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
                throw new \Exception("Le fichier temporaire est introuvable.");
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
                foreach ($objects as $obj) {
                    AnatomicalObject::create([
                        'id'            => $obj['id'] ?? (int)round(microtime(true) * 1000),
                        'parent_id'     => $obj['parent_id'] ?? null,
                        'asset_3d_id'   => $asset->id,
                        'name'          => $obj['name'] ?? 'Inconnu',
                        'three_js_name' => $obj['three_js_name'] ?? ($obj['name'] ?? 'Object'),
                        'mesh'          => $obj['mesh'] ?? null,
                        'description'   => $obj['description'] ?? null,
                    ]);
                }

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
