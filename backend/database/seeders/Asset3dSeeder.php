<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Asset3d;
use App\Models\User;

class Asset3dSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Find the admin user
        $admin = User::where('email', 'admin@gmail.com')->first();

        if ($admin) {
            Asset3d::updateOrCreate(
                ['url_glb' => 'Assets_3D/Squelette_complet.glb'],
                [
                    'version_cache' => 1,
                    'admin_id' => $admin->id
                ]
            );

            $this->command->info('Asset3d model Assets_3D/Squelette_complet.glb seeded successfully.');
        } else {
            $this->command->error('Admin user not found, cannot seed Asset3d.');
        }
    }
}
