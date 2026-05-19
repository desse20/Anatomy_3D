<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class AnatomyController extends Controller
{
    private function getJsonPath(): string
    {
        // On cherche d'abord dans public, puis dans storage
        $publicPath = public_path('anatomy_database.json');
        if (File::exists($publicPath)) return $publicPath;

        $storagePath = storage_path('app/anatomy_database.json');
        if (File::exists($storagePath)) return $storagePath;

        // Fallback : dans le dossier parent du projet
        $parentPath = base_path('../anatomy_database.json');
        if (File::exists($parentPath)) return $parentPath;

        return '';
    }

    /**
     * GET /api/anatomy/roots
     * Retourne les systèmes anatomiques principaux (2ème niveau de hiérarchie)
     * en filtrant les nœuds techniques (Cross Section, HOW TO, etc.)
     */
    public function roots()
    {
        $jsonPath = $this->getJsonPath();
        if (!$jsonPath) {
            return response()->json(['error' => 'anatomy_database.json not found'], 404);
        }

        // Nœuds techniques à exclure
        $excluded = ['Cross Section', 'HOW TO', 'Take a picture', 'Reference lines', 'Reference planes', 'Movements'];

        try {
            $data = json_decode(File::get($jsonPath), true);
            if (!$data || !isset($data['hierarchy_tree'])) {
                return response()->json(['error' => 'Invalid JSON structure'], 500);
            }

            // "Corps Humain" est le seul nœud racine → on prend ses enfants
            $topNode  = $data['hierarchy_tree'][0];
            $children = $topNode['children'] ?? [];

            $roots = collect($children)
                ->filter(function ($node) use ($excluded) {
                    $name = $node['clean_name'] ?? $node['name'];
                    foreach ($excluded as $ex) {
                        if (stripos($name, $ex) !== false) return false;
                    }
                    return !empty($node['children']);
                })
                ->map(function ($node) {
                    $name = $node['clean_name'] ?? $node['name'];
                    // Nettoyer le suffixe .g
                    $cleanName = preg_replace('/\.g$/', '', $name);
                    return [
                        'name'        => $cleanName,
                        'raw_name'    => $node['name'],
                        'type'        => $node['type'] ?? 'group',
                        'child_count' => count($node['children'] ?? []),
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
        $jsonPath = $this->getJsonPath();
        if (!$jsonPath) {
            return response()->json(['error' => 'File not found'], 404);
        }

        try {
            $data = json_decode(File::get($jsonPath), true);
            $tree  = $data['hierarchy_tree'] ?? [];

            // Trouver le nœud racine demandé
            $rootNode = null;
            foreach ($tree as $node) {
                if (
                    strtolower($node['name']) === strtolower($name) ||
                    strtolower($node['clean_name'] ?? '') === strtolower($name)
                ) {
                    $rootNode = $node;
                    break;
                }
            }

            if (!$rootNode) {
                return response()->json(['error' => "Node '$name' not found"], 404);
            }

            // Extraire récursivement tous les noms (pour le ciblage IA)
            $allNames = [];
            $this->collectNames($rootNode, $allNames);

            return response()->json([
                'root'      => $rootNode['clean_name'] ?? $rootNode['name'],
                'all_names' => $allNames,
                'count'     => count($allNames),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function collectNames(array $node, array &$names): void
    {
        $name = $node['clean_name'] ?? $node['name'];
        if (!empty($name) && ($node['type'] ?? '') === 'mesh') {
            $names[] = $name;
        }
        foreach ($node['children'] ?? [] as $child) {
            $this->collectNames($child, $names);
        }
    }

    /**
     * GET /api/anatomy/search?q={query}
     * Recherche un terme dans tout l'arbre anatomique et retourne les correspondances.
     */
    public function search(Request $request)
    {
        $query = $request->query('q', '');
        if (empty($query) || strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        $jsonPath = $this->getJsonPath();
        if (!$jsonPath) {
            return response()->json(['error' => 'File not found'], 404);
        }

        try {
            $data = json_decode(File::get($jsonPath), true);
            $tree  = $data['hierarchy_tree'] ?? [];
            $results = [];

            $this->searchInTree($tree, strtolower($query), $results);

            // Prendre les 20 premiers résultats pour ne pas surcharger
            return response()->json(['results' => array_slice($results, 0, 20)]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function searchInTree(array $nodes, string $query, array &$results): void
    {
        foreach ($nodes as $node) {
            $name = $node['clean_name'] ?? $node['name'];
            if (stripos($name, $query) !== false) {
                // Ignore technical nodes
                $excluded = ['Cross Section', 'HOW TO', 'Take a picture', 'Reference lines', 'Reference planes', 'Movements'];
                $isExcluded = false;
                foreach ($excluded as $ex) {
                    if (stripos($name, $ex) !== false) {
                        $isExcluded = true;
                        break;
                    }
                }
                if (!$isExcluded) {
                    $results[] = [
                        'name' => $name,
                        'raw_name' => $node['name'],
                        'type' => $node['type'] ?? 'group',
                        'child_count' => count($node['children'] ?? [])
                    ];
                }
            }
            if (!empty($node['children'])) {
                $this->searchInTree($node['children'], $query, $results);
            }
        }
    }
}
