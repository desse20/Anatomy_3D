<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\AnatomicalObject;

class AnatomySeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Supporte deux formats de fichier anatomy_hierarchy.json :
     *
     * ANCIEN (string plat) :
     *   { "name": "Clavicule.L", "description": "CLAVICLE\n..." }
     *
     * NOUVEAU (multilingue JSON) :
     *   { "name": { "en": "Clavicle", "fr": "Clavicule" },
     *     "description": { "en": "...", "fr": "" } }
     *
     * Le seeder normalise automatiquement les anciens formats
     * en les enveloppant dans { "en": "...", "fr": "" }.
     *
     * @return void
     */
    public function run()
    {
        $path = storage_path('app/private/Assets_3D/anatomy_hierarchy.json');

        if (!file_exists($path)) {
            $this->command->error("File anatomy_hierarchy.json not found.");
            return;
        }

        $json = file_get_contents($path);
        $data = json_decode($json, true);

        if (!$data) {
            $this->command->error('Error parsing JSON.');
            return;
        }

        // Handle both {"data": [...]} and [...] format
        if (isset($data['data'])) {
            $data = $data['data'];
        }

        // Disable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Nettoyer la table pour repartir à zéro
        DB::table('user_mastery')->truncate();
        DB::table('anatomical_objects')->truncate();
        $this->command->info('Old records truncated.');

        $asset = \App\Models\Asset3d::first();

        if (!$asset) {
            $this->command->error("Aucun Asset3D trouvé ! Exécutez Asset3dSeeder d'abord.");
            return;
        }

        $count = 0;
        foreach ($data as $item) {
            if (!isset($item['id'])) {
                continue;
            }

            // ── Normalisation du champ NAME ─────────────────────────────────
            // Nouveau format : { "en": "...", "fr": "..." }
            // Ancien format  : "Clavicule.L"  → on l'enveloppe
            $rawName = $item['name'] ?? '';
            if (is_array($rawName)) {
                $nameJson = [
                    'en' => trim($rawName['en'] ?? ''),
                    'fr' => trim($rawName['fr'] ?? ''),
                ];
            } else {
                // Ancien : chaîne brute french (nom du fichier Blender)
                $nameJson = [
                    'en' => '',
                    'fr' => trim((string) $rawName),
                ];
            }

            // ── Normalisation du champ DESCRIPTION ──────────────────────────
            // Nouveau format : { "en": "...", "fr": "..." }
            // Ancien format  : string en anglais uniquement
            $rawDesc = $item['description'] ?? null;
            if ($rawDesc === null) {
                $descJson = null;
            } elseif (is_array($rawDesc)) {
                $descJson = [
                    'en' => $this->cleanText($rawDesc['en'] ?? ''),
                    'fr' => $this->cleanText($rawDesc['fr'] ?? ''),
                ];
            } else {
                // Ancien : description en anglais brute
                $descJson = [
                    'en' => $this->cleanText((string) $rawDesc),
                    'fr' => '',
                ];
            }

            AnatomicalObject::updateOrCreate(
                ['id' => $item['id']],
                [
                    'parent_id'    => $item['parent_id'] ?? null,
                    'asset_3d_id'  => $asset->id,
                    'name'         => $nameJson,        // array → JSON auto via cast
                    'three_js_name' => $item['three_js_name'] ?? '',
                    'mesh'         => $item['type'] ?? null,
                    'description'  => $descJson,        // array|null → JSON auto via cast
                ]
            );
            $count++;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info("Anatomy database seeded successfully! ({$count} records inserted or updated)");
    }

    /**
     * Nettoie une chaîne de description :
     * - Supprime les retours à la ligne excessifs
     * - Supprime les espaces multiples
     */
    private function cleanText(string $text): string
    {
        $text = str_replace(["\r", "\n"], ' ', $text);
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }
}
