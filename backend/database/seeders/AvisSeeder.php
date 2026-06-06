<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Review;
use App\Models\User;

class AvisSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('role', '!=', 'admin')->get();

        if ($users->isEmpty()) {
            $this->command->warn('Aucun utilisateur non-admin trouvé. Exécute d\'abord UserSeeder.');
            return;
        }

        $reviews = [
            ['rating' => 5, 'comment' => 'Plateforme incroyable, la 3D est d\'une précision impressionnante !', 'type' => 'platform'],
            ['rating' => 4, 'comment' => 'Très utile pour mes révisions d\'anatomie, je recommande.', 'type' => 'platform'],
            ['rating' => 5, 'comment' => 'Les étudiants adorent manipuler les modèles en classe.', 'type' => 'platform'],
            ['rating' => 4, 'comment' => 'Le rendu des muscles est excellent, on voit chaque détail.', 'type' => 'model_3d'],
            ['rating' => 5, 'comment' => 'Beaucoup mieux que les atlas papier, la rotation 3D change tout.', 'type' => 'model_3d'],
            ['rating' => 3, 'comment' => 'Bon outil mais quelques bugs de chargement parfois.', 'type' => 'platform'],
            ['rating' => 5, 'comment' => 'Génial pour préparer mes cours de biologie humaine.', 'type' => 'platform'],
            ['rating' => 4, 'comment' => 'Le cœur en 3D est magnifique, très réaliste.', 'type' => 'object'],
            ['rating' => 5, 'comment' => 'Outil pédagogique indispensable pour les études de médecine.', 'type' => 'platform'],
            ['rating' => 4, 'comment' => 'Interface intuitive et modèles très détaillés.', 'type' => 'model_3d'],
        ];

        foreach ($reviews as $review) {
            $user = $users->random();
            Review::create([
                'user_id'    => $user->id,
                'type'       => $review['type'],
                'rating'     => $review['rating'],
                'comment'    => $review['comment'],
                'created_at' => now()->subDays(rand(0, 60)),
            ]);
        }

        $this->command->info('10 avis créés avec succès.');
    }
}
