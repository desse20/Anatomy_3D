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
     * @return void
     */
    public function run()
    {
        $path = storage_path('app/anatomy_hierarchy.json');
        
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

        // Disable foreign key checks to avoid issues if JSON doesn't list parents strictly before children
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Nettoyer complètement la table pour repartir à zéro
        DB::table('user_mastery')->truncate();
        DB::table('anatomical_objects')->truncate();
        $this->command->info('Old records truncated.');

        $count = 0;
        foreach ($data as $item) {
            if (!isset($item['id'])) {
                continue;
            }

            $description = '';
            if (isset($item['description'])) {
                // Remplacer les retours à la ligne par des espaces
                $description = str_replace(["\r", "\n"], ' ', $item['description']);
                // Enlever les espaces multiples
                $description = preg_replace('/\s+/', ' ', $description);
                $description = trim($description);
            }

            AnatomicalObject::updateOrCreate(
                ['id' => $item['id']],
                [
                    'parent_id' => $item['parent_id'] ?? null,
                    'name' => $item['name'] ?? '',
                    'three_js_name' => $item['three_js_name'] ?? '',
                    'mesh' => $item['type'] ?? null,
                    'description' => $description
                ]
            );
            $count++;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info("Anatomy database seeded successfully! ({$count} records inserted or updated)");
    }
}
