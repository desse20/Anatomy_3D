<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AnatomicalObject;
use App\Models\ConsultationLog;

class AnatomyController extends Controller
{
    /**
     * GET /api/anatomy/all
     * Retourne TOUTE la hiérarchie (léger) pour le viewer 3D
     */
    public function all(Request $request)
    {
        try {
            $query = AnatomicalObject::select('id', 'name', 'parent_id', 'mesh', 'description', 'three_js_name', 'updated_at');
            
            if ($request->has('asset_3d_id')) {
                $query->where('asset_3d_id', $request->asset_3d_id);
            }

            if ($request->has('since')) {
                $query->where('updated_at', '>', $request->since);
            }

            $objects = $query->get()
                ->map(function($obj) {
                    // name est un array casté depuis JSON : {"en":"...","fr":"..."}
                    $name = $obj->name;
                    if (!is_array($name)) {
                        // Compatibilité ancien format plain string
                        $name = ['fr' => preg_replace('/\.g$/i', '', (string)$name), 'en' => ''];
                    } else {
                        $name = [
                            'fr' => preg_replace('/\.g$/i', '', $name['fr'] ?? ''),
                            'en' => preg_replace('/\.g$/i', '', $name['en'] ?? ''),
                        ];
                    }

                    $desc = $obj->description;
                    if (!is_array($desc)) {
                        $desc = ['en' => (string)$desc, 'fr' => ''];
                    }

                    return [
                        'id'           => $obj->id,
                        'name'         => $name,
                        'three_js_name' => $obj->three_js_name,
                        'parent_id'    => $obj->parent_id,
                        'type'         => strtolower($obj->mesh ?? '') === 'mesh' ? 'mesh' : 'group',
                        'description'  => $desc,
                        'updated_at'   => $obj->updated_at
                    ];
                });

            return response()->json($objects);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/anatomy/roots
     * Retourne les systèmes anatomiques principaux
     */
    public function roots()
    {
        $excluded = ['Cross Section', 'HOW TO', 'Take a picture', 'Reference lines', 'Reference planes', 'Movements'];

        try {
            $topNode = AnatomicalObject::where('id', 1)->first();
            
            if ($topNode && AnatomicalObject::where('parent_id', $topNode->id)->count() > 0) {
                $nodes = AnatomicalObject::where('parent_id', $topNode->id)->withCount('children')->get();
            } else {
                $nodes = AnatomicalObject::whereNull('parent_id')->withCount('children')->get();
                if ($nodes->count() === 1) {
                    $nodes = AnatomicalObject::where('parent_id', $nodes->first()->id)->withCount('children')->get();
                }
            }

            $roots = $nodes->filter(function ($node) use ($excluded) {
                    $name = $node->getName('fr') ?: $node->getName('en');
                    foreach ($excluded as $ex) {
                        if (stripos($name, $ex) !== false) return false;
                    }
                    return true;
                })
                ->map(function ($node) {
                    $nameFr  = preg_replace('/\.g$/i', '', $node->getName('fr'));
                    $nameEn  = preg_replace('/\.g$/i', '', $node->getName('en'));
                    return [
                        'name'        => ['en' => $nameEn, 'fr' => $nameFr],
                        'raw_name'    => $node->three_js_name ?? ($nameFr ?: $nameEn),
                        'type'        => 'group',
                        'child_count' => $node->children_count,
                        'id'          => $node->id
                    ];
                })
                ->values();

            return response()->json(['roots' => $roots]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/anatomy/subtree/{name}
     * Retourne récursivement tous les noms de meshes dans un sous-arbre
     */
    public function subtree(string $name)
    {
        try {
            // Cherche d'abord en FR puis EN dans le JSON
            $rootNode = AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.fr') LIKE ?", ["%{$name}%"])->first()
                     ?? AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.en') LIKE ?", ["%{$name}%"])->first();

            if (!$rootNode) {
                return response()->json(['error' => __('messages.anatomy.node_not_found', ['name' => $name])], 404);
            }

            $allNames = [];
            $this->collectNamesFromDb($rootNode, $allNames);

            $cleanName = preg_replace('/\.g$/i', '', $rootNode->getName('fr') ?: $rootNode->getName('en'));

            return response()->json([
                'root'      => $cleanName,
                'all_names' => $allNames,
                'count'     => count($allNames),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function collectNamesFromDb($node, array &$names): void
    {
        $nameFr = $node->getName('fr');
        $nameEn = $node->getName('en');
        $cleanName = preg_replace('/\.g$/i', '', $nameFr ?: $nameEn);
        
        if (!empty($cleanName) && strtolower($node->mesh ?? '') === 'mesh') {
            $names[] = $cleanName;
        }
        
        $children = AnatomicalObject::where('parent_id', $node->id)->get();
        foreach ($children as $child) {
            $this->collectNamesFromDb($child, $names);
        }
    }

    /**
     * GET /api/anatomy/search?q={query}
     * Recherche un terme dans tout l'arbre anatomique
     */
    public function search(Request $request)
    {
        $query = $request->query('q', '');
        if (empty($query) || strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        try {
            $results  = [];
            $excluded = ['Cross Section', 'HOW TO', 'Take a picture', 'Reference lines', 'Reference planes', 'Movements'];

            // Recherche dans name.fr ET name.en (JSON column)
            $nodes = AnatomicalObject::
                where(function($q) use ($query) {
                    $q->whereRaw("JSON_EXTRACT(name, '$.fr') LIKE ?", ["%{$query}%"])
                      ->orWhereRaw("JSON_EXTRACT(name, '$.en') LIKE ?", ["%{$query}%"]);
                })
                ->withCount('children')
                ->limit(20)
                ->get();

            foreach ($nodes as $node) {
                $nameFr    = preg_replace('/\.g$/i', '', $node->getName('fr'));
                $nameEn    = preg_replace('/\.g$/i', '', $node->getName('en'));
                $cleanName = $nameFr ?: $nameEn;

                $isExcluded = false;
                foreach ($excluded as $ex) {
                    if (stripos($cleanName, $ex) !== false) {
                        $isExcluded = true;
                        break;
                    }
                }

                if (!$isExcluded) {
                    $results[] = [
                        'id'          => $node->id,
                        'name'        => ['en' => $nameEn, 'fr' => $nameFr],
                        'raw_name'    => $node->three_js_name ?? ($nameFr ?: $nameEn),
                        'type'        => strtolower($node->mesh ?? '') === 'mesh' ? 'mesh' : 'group',
                        'child_count' => $node->children_count
                    ];
                }
            }

            return response()->json(['results' => array_slice($results, 0, 20)]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/anatomy/log
     * Enregistre une consultation d'objet anatomique
     */
    public function logConsultation(Request $request)
    {
        $request->validate([
            'object_id' => 'required_without:object_name|integer',
            'object_name' => 'required_without:object_id|string',
        ]);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);

        $objectId = $request->object_id;
        if (!$objectId && $request->object_name) {
            // Cherche d'abord en FR, puis EN
            $obj = AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.fr') = ?", [$request->object_name])->first()
                ?? AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.en') = ?", [$request->object_name])->first();
            if ($obj) $objectId = $obj->id;
        }

        if (!$objectId) {
            return response()->json(['error' => 'Object not found'], 404);
        }

        // Créer l'entrée dans le journal
        ConsultationLog::create([
            'user_id' => $user->id,
            'anatomical_object_id' => $objectId,
            'viewed_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }
}
