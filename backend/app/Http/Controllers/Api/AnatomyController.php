<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AnatomicalObject;

class AnatomyController extends Controller
{
    /**
     * GET /api/anatomy/all
     * Retourne TOUTE la hiérarchie (léger) pour le viewer 3D
     */
    public function all()
    {
        try {
            $objects = AnatomicalObject::select('id', 'name', 'parent_id', 'mesh', 'description')
                ->get()
                ->map(function($obj) {
                    return [
                        'id' => $obj->id,
                        'name' => preg_replace('/\.g$/i', '', $obj->name),
                        'three_js_name' => $obj->name, // Le nom brut est utilisé dans Three.js
                        'parent_id' => $obj->parent_id,
                        'type' => strtolower($obj->mesh ?? '') === 'mesh' ? 'mesh' : 'group',
                        'description' => $obj->description
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
            // Le "vrai" parent de tous les systèmes a souvent l'ID 1 (Treatise on Man / Corps Humain)
            $topNode = AnatomicalObject::where('id', 1)->first();
            
            if ($topNode && AnatomicalObject::where('parent_id', $topNode->id)->count() > 0) {
                $nodes = AnatomicalObject::where('parent_id', $topNode->id)->withCount('children')->get();
            } else {
                // Secours : on prend ce qui est explicitement null, mais trié
                $nodes = AnatomicalObject::whereNull('parent_id')->withCount('children')->get();
                if ($nodes->count() === 1) {
                    $nodes = AnatomicalObject::where('parent_id', $nodes->first()->id)->withCount('children')->get();
                }
            }

            $roots = $nodes->filter(function ($node) use ($excluded) {
                    $name = $node->name;
                    foreach ($excluded as $ex) {
                        if (stripos($name, $ex) !== false) return false;
                    }
                    return clone $node;
                })
                ->map(function ($node) {
                    $name = $node->name;
                    $cleanName = preg_replace('/\.g$/i', '', $name);
                    return [
                        'name'        => $cleanName,
                        'raw_name'    => $name,
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
            $rootNode = AnatomicalObject::where('name', 'LIKE', $name . '%')->first();

            if (!$rootNode) {
                // Essayer sans le cas
                $rootNode = AnatomicalObject::where('name', 'LIKE', '%' . $name . '%')->first();
                if (!$rootNode) {
                    return response()->json(['error' => "Node '$name' not found"], 404);
                }
            }

            $allNames = [];
            $this->collectNamesFromDb($rootNode, $allNames);

            $cleanName = preg_replace('/\.g$/i', '', $rootNode->name);

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
        $cleanName = preg_replace('/\.g$/i', '', $node->name);
        
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
            $results = [];
            $excluded = ['Cross Section', 'HOW TO', 'Take a picture', 'Reference lines', 'Reference planes', 'Movements'];

            $nodes = AnatomicalObject::where('name', 'LIKE', '%' . $query . '%')
                        ->withCount('children')
                        ->limit(20)
                        ->get();

            foreach ($nodes as $node) {
                $name = $node->name;
                $cleanName = preg_replace('/\.g$/i', '', $name);
                
                $isExcluded = false;
                foreach ($excluded as $ex) {
                    if (stripos($name, $ex) !== false) {
                        $isExcluded = true;
                        break;
                    }
                }

                if (!$isExcluded) {
                    $results[] = [
                        'name' => $cleanName,
                        'raw_name' => $name,
                        'type' => strtolower($node->mesh ?? '') === 'mesh' ? 'mesh' : 'group',
                        'child_count' => $node->children_count
                    ];
                }
            }

            return response()->json(['results' => array_slice($results, 0, 20)]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
