<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Lab;
use App\Models\SharedView;
use App\Models\LabParticipant;
use App\Models\LabSharedView;
use App\Models\Review;
use App\Models\UserMastery;
use App\Models\ConsultationLog;
use App\Models\AnatomicalObject;
use App\Models\Asset3d;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class RealisticMockSeeder extends Seeder
{
    private $faker;

    /**
     * Génère les entrées UserMastery pour une liste d'IDs utilisateurs.
     *
     * @param array  $userIds       IDs des utilisateurs à couvrir
     * @param array  $anatomyIds    Tous les IDs d'objets anatomiques disponibles
     * @param float  $minCoverage   Fraction minimale des objets à couvrir (ex: 0.80)
     * @param float  $maxCoverage   Fraction maximale des objets à couvrir (ex: 0.90)
     * @param array  $weightedLevels Tableau de niveaux pondérés pour le tirage aléatoire
     */
    private function seedMasteryForUsers(
        array $userIds,
        array $anatomyIds,
        float $minCoverage,
        float $maxCoverage,
        array $weightedLevels
    ): void {
        if (empty($userIds) || empty($anatomyIds)) {
            return;
        }

        $total = count($anatomyIds);

        foreach ($userIds as $userId) {
            // IDs déjà seedés pour cet utilisateur (évite doublons si relance)
            $alreadyDone = DB::table('user_mastery')
                ->where('user_id', $userId)
                ->pluck('anatomical_object_id')
                ->toArray();

            $remaining = array_values(array_diff($anatomyIds, $alreadyDone));

            if (empty($remaining)) {
                continue;
            }

            $targetCount = (int) round($this->faker->randomFloat(
                2,
                $minCoverage * $total,
                $maxCoverage * $total
            ));
            $targetCount = max(1, min($targetCount, count($remaining)));

            // Sélection aléatoire sans répétition
            shuffle($remaining);
            $selectedIds = array_slice($remaining, 0, $targetCount);

            $batch = [];
            foreach ($selectedIds as $objId) {
                $masteryLevel = $weightedLevels[array_rand($weightedLevels)];
                $successCount = $masteryLevel * $this->faker->numberBetween(2, 8);
                $failureCount = max(0, $this->faker->numberBetween(0, 6) - ($masteryLevel - 1));

                // Calcul réaliste des dates de révision (Spaced Repetition)
                // Niveau 1 : révision très fréquente (dans 1-2 jours)
                // Niveau 5 : révision rare (dans 30-60 jours)
                // Plus l'utilisateur a d'items, plus on étale la plage pour éviter
                // que toutes les prochaines révisions ne tombent en même temps.
                $spreadDays = max(30, min(90, (int) floor(count($selectedIds) / 3)));
                $lastReview = $this->faker->dateTimeBetween("-{$spreadDays} days", 'now');
                $daysUntilNext = match($masteryLevel) {
                    0 => $this->faker->numberBetween(1, 2),
                    1 => $this->faker->numberBetween(1, 3),
                    2 => $this->faker->numberBetween(3, 7),
                    3 => $this->faker->numberBetween(7, 14),
                    4 => $this->faker->numberBetween(14, 30),
                    5 => $this->faker->numberBetween(30, 90),
                    default => 1
                };
                
                $nextReview = (clone $lastReview)->modify("+$daysUntilNext days");

                $batch[] = [
                    'id'                   => (string) Str::uuid(),
                    'user_id'              => $userId,
                    'anatomical_object_id' => $objId,
                    'success_count'        => $successCount,
                    'failure_count'        => $failureCount,
                    'mastery_level'        => $masteryLevel,
                    'last_review_at'       => $lastReview->format('Y-m-d H:i:s'),
                    'next_review_at'       => $nextReview->format('Y-m-d H:i:s'),
                ];

                if (count($batch) >= 500) {
                    DB::table('user_mastery')->insert($batch);
                    $batch = [];
                }
            }
            if (!empty($batch)) {
                DB::table('user_mastery')->insert($batch);
            }
        }
    }

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // On fixe le fuseau sur +01:00 (Porto-Novo) pour éviter les erreurs de DST
        // car ce fuseau n'a pas de changements d'heure (contrairement à l'Europe)
        DB::statement("SET time_zone='+01:00'");

        $this->faker = Faker::create('fr_FR');

        // ---------------------------------------------------------------
        // Poids de maîtrise partagés (utilisés dans seedMasteryForUsers)
        // distribution réaliste : niveaux bas (0, 1, 2) plus fréquents
        // level 0 → 20%, 1 → 25%,  2 → 20%,  3 → 15%,  4 → 12%,  5 → 8%
        $masteryWeights = [0 => 20, 1 => 25, 2 => 20, 3 => 15, 4 => 12, 5 => 8];
        $weightedLevels = [];
        foreach ($masteryWeights as $level => $weight) {
            for ($w = 0; $w < $weight; $w++) {
                $weightedLevels[] = $level;
            }
        }

        $allAnatomy  = AnatomicalObject::all();
        $anatomyIds  = $allAnatomy->pluck('id')->toArray();

        // ---------------------------------------------------------------
        // 1. Générer les Admins (objectif 5 au total)
        // ---------------------------------------------------------------
        // Listes de noms béninois pour l'authenticité (enrichies : Fon, Yoruba, Musulmans, etc.)
        $beninFirstNames = [
            'Sènan', 'Mahugnon', 'Koffi', 'Kojo', 'Oluwafemi', 'Babatunde', 'Afi', 'Mawuena', 
            'Dossou', 'Tunde', 'Femi', 'Sèmèvo', 'Ekoué', 'Sessi', 'Djidjoho', 'Vignon',
            'Sèdami', 'Mawulé', 'Noudéhouénou', 'Fidèle', 'Pascaline', 'Benoît', 'Gisèle',
            'Mohamed', 'Matinou', 'Adjao', 'Rachad', 'Latif', 'Hamidou', 'Fatouma', 'Zaliatou',
            'Saliou', 'Kadir', 'Moussa', 'Issa', 'Idrissou', 'Bachirou', 'Abdoulaye', 'Yasmine'
        ];
        $beninLastNames = [
            'Dossou', 'Houngbédji', 'Gnonlonfoun', 'Soglo', 'Talon', 'Yayi', 'Zinsou', 'Bio',
            'Kérékou', 'Adjovi', 'Gbaguidi', 'Adadé', 'Kodjo', 'Lawson', 'Ajavon', 'Toli',
            'Houndété', 'Amoussou', 'Degla', 'Agbakou', 'Migan', 'Codjia', 'Sodjinou',
            'BELLO', 'Damasho', 'Alidou', 'Tijani', 'Salami', 'Orou', 'Mama', 'Abdou', 'Tidjani'
        ];

        // --- Création d'étudiants (environ 150) ---
        $this->command->info('Création de 150 étudiants béninois...');
        for ($i = 0; $i < 150; $i++) {
            $fname = $this->faker->randomElement($beninFirstNames);
            $lname = $this->faker->randomElement($beninLastNames);
            User::create([
                'id'         => (string) Str::uuid(),
                'firstname' => $fname,
                'lastname'  => $lname,
                'email'     => strtolower($fname . '.' . $lname . $i) . '@gmail.com',
                'password'  => Hash::make('password'),
                'role'      => 'student',
                'created_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            ]);
        }

        // --- Création de professeurs (environ 20) ---
        $this->command->info('Création de 20 professeurs béninois...');
        for ($i = 0; $i < 20; $i++) {
            $fname = $this->faker->randomElement($beninFirstNames);
            $lname = $this->faker->randomElement($beninLastNames);
            User::create([
                'id'         => (string) Str::uuid(),
                'firstname' => 'Dr. ' . $fname,
                'lastname'  => $lname,
                'email'     => strtolower('prof.' . $fname . '.' . $lname . $i) . '@gmail.com',
                'password'  => Hash::make('password'),
                'role'      => 'teacher',
                'created_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            ]);
        }

        $currentAdmins = User::where('role', 'admin')->count();
        for ($i = 0; $i < (5 - $currentAdmins); $i++) {
            User::create([
                'id'         => (string) Str::uuid(),
                'firstname'  => $this->faker->firstName,
                'lastname'   => $this->faker->lastName,
                'email'      => $this->faker->unique()->safeEmail,
                'password'   => Hash::make('password'),
                'role'       => 'admin',
                'created_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            ]);
        }

        $allAssets = Asset3d::all();

        // Enrichir TOUS les enseignants avec des Labs et des Vues s'ils n'en ont pas
        $teachers = User::where('role', 'teacher')->get();
        foreach ($teachers as $teacher) {
            $existingLabsCount = Lab::where('user_id', $teacher->id)->count();
            if ($existingLabsCount > 0) continue;

            $labNames = [
                'Licence 1 - FSS Cotonou', 'Licence 2 - FSS Cotonou', 
                'Licence 1 - FM Parakou', 'Master - Anatomie Chirurgicale',
            ];

            if ($this->faker->boolean(95)) { 
                $numLabs = $this->faker->numberBetween(2, 4);
                for ($j = 0; $j < $numLabs; $j++) {
                    $descriptions = [
                        'Supports de cours pour les séances de travaux pratiques.',
                        'Focus sur l\'anatomie descriptive et fonctionnelle.',
                        'Vues 3D annotées pour la préparation de l\'examen.',
                        'Étude détaillée des rapports anatomiques.',
                    ];
                    $lab = Lab::create([
                        'id'          => (string) Str::uuid(),
                        'user_id'     => $teacher->id,
                        'name'        => ($labNames[$j] ?? 'UE Anatomie') . ' - ' . $teacher->lastname . ' (Grp ' . $this->faker->unique()->numberBetween(100, 9999) . ')',
                        'description' => $this->faker->randomElement($descriptions),
                    ]);

                    if ($allAssets->count() > 0) {
                        $numViews = $this->faker->numberBetween(3, 7);
                        for ($k = 0; $k < $numViews; $k++) {
                            $teacherNotes = [
                                'Observez bien l\'insertion des tendons sur cette zone.',
                                'Focus sur la vascularisation de cet organe.',
                                'Attention à la distinction entre artère et veine ici.',
                                'Notez la courbure spécifique visible sous cet angle.',
                                'À mémoriser pour l\'examen final.',
                                'Détails importants sur les structures nerveuses environnantes.',
                                'Comparez cette vue avec le schéma du manuel.',
                                'Observez la symétrie des structures présentées.',
                                'Focus sur les rapports anatomiques profonds.',
                                'Angle de vue optimal pour comprendre la profondeur.',
                            ];
                            $view = SharedView::create([
                                'user_id'         => $teacher->id,
                                'asset_3d_id'     => $allAssets->random()->id,
                                'status'          => 'visible',
                                'camera_position' => ['x' => rand(-5, 5), 'y' => rand(0, 5), 'z' => rand(-5, 5)],
                                'camera_target'   => ['x' => 0, 'y' => 0, 'z' => 0],
                                'scene_state'     => [],
                                'teacher_note'    => $this->faker->randomElement($teacherNotes), // Pas de optional() ici, note obligatoire
                            ]);

                            LabSharedView::create([
                                'lab_id'         => $lab->id,
                                'shared_view_id' => $view->id,
                            ]);
                        }
                    }
                }
            }
        }

        // 3. Générer les Étudiants (objectif 130 au total)
        // ---------------------------------------------------------------
        $targetStudentCount = 130;
        $currentStudents = User::where('role', 'student')->count();
        $allLabs = Lab::all();

        for ($i = 0; $i < ($targetStudentCount - $currentStudents); $i++) {
            User::create([
                'id'         => (string) Str::uuid(),
                'firstname'  => $this->faker->firstName,
                'lastname'   => $this->faker->lastName,
                'email'      => $this->faker->unique()->safeEmail,
                'password'   => Hash::make('password'),
                'role'       => 'student',
                'created_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            ]);
        }

        // Inscrire TOUS les étudiants à des labs s'ils n'ont pas de participation
        $students = User::where('role', 'student')->get();
        foreach ($students as $student) {
            $existingCount = LabParticipant::where('user_id', $student->id)->count();
            if ($existingCount > 0) continue;

            if ($allLabs->count() > 0) {
                $numToJoin = $this->faker->numberBetween(1, min(5, $allLabs->count()));
                $myLabs = $allLabs->random($numToJoin);
                foreach ($myLabs as $lab) {
                    LabParticipant::create([
                        'lab_id'    => $lab->id,
                        'user_id'   => $student->id,
                        'joined_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
                    ]);
                }
            }
        }

        // ---------------------------------------------------------------
        // 4. Générer 100 Avis (Reviews)
        // ---------------------------------------------------------------
        $allUsers = User::all();
        $types    = ['platform', 'model_3d', 'object'];
        $reviewComments = [
            'L\'application est vraiment excellente pour réviser !',
            'Les modèles 3D sont très détaillés et fluides.',
            'Très utile pour comprendre la structure complexe des organes.',
            'L\'interface est intuitive et facile à prendre en main.',
            'Un outil indispensable pour tout étudiant en santé.',
            'Merci pour cet outil, ça m\'aide énormément pour mes partiels.',
            'Quelques bugs mineurs mais l\'ensemble est top.',
            'J\'adore pouvoir manipuler les modèles sous tous les angles.',
            'Les annotations des profs sont un vrai plus.',
            'Superbe rendu visuel, très réaliste !',
        ];

        for ($i = 0; $i < 100; $i++) {
            Review::create([
                'user_id' => $allUsers->random()->id,
                'type'    => $this->faker->randomElement($types),
                'rating'  => $this->faker->numberBetween(4, 5),
                'comment' => $this->faker->optional(0.9)->randomElement($reviewComments),
            ]);
        }

        // ---------------------------------------------------------------
        // 5. Journal de Consultations — TOUS les utilisateurs (20–50 / user)
        // Inclut les utilisateurs existants de UserSeeder
        // ---------------------------------------------------------------
        if (!empty($anatomyIds)) {
            $this->command->info('Génération des journaux de consultation...');
            $allUserIds      = User::pluck('id')->toArray();
            $consultBatch    = [];

            foreach ($allUserIds as $userId) {
                // Ne pas ré-seeder si des logs existent déjà pour cet user
                $existing = DB::table('consultation_logs')->where('user_id', $userId)->count();
                if ($existing > 0) {
                    continue;
                }

                // Sélectionner un échantillon d'objets (ex: 15 à 30 objets)
                $selectedObjects = array_rand(array_flip($anatomyIds), $this->faker->numberBetween(15, 30));
                
                foreach ($selectedObjects as $objId) {
                    // Pour chaque objet, entre 1 et 100 visites
                    $visitsPerObject = $this->faker->numberBetween(1, 100);
                    for ($v = 0; $v < $visitsPerObject; $v++) {
                        $consultBatch[] = [
                            'id'                   => (string) Str::uuid(),
                            'user_id'              => $userId,
                            'anatomical_object_id' => $objId,
                            'viewed_at'            => $this->faker->dateTimeBetween('-6 months', 'now')->format('Y-m-d H:i:s'),
                        ];

                        if (count($consultBatch) >= 500) {
                            DB::table('consultation_logs')->insert($consultBatch);
                            $consultBatch = [];
                        }
                    }
                }
            }
            if (!empty($consultBatch)) {
                DB::table('consultation_logs')->insert($consultBatch);
            }

            $this->command->info('Journaux de consultation générés pour ' . count($allUserIds) . ' utilisateurs.');
        }

        // ---------------------------------------------------------------
        // 6. Niveaux de Maîtrise (UserMastery) — TOUS les rôles
        //
        // Étudiants : 500 – 1200 objets  (ou tous si < 500 dispo)
        // Enseignants: 80  – 90%  des objets
        // Admins     :  2  –  5%  des objets
        //
        // Les utilisateurs de UserSeeder (admin@, teacher@, student@)
        // sont inclus automatiquement car on requête par rôle.
        // La méthode seedMasteryForUsers() ignore les entrées déjà existantes.
        // ---------------------------------------------------------------
        if (!empty($anatomyIds)) {
            $totalObjects = count($anatomyIds);

            // --- Étudiants (500 – 1200 objets) ---
            $this->command->info('Génération de la maîtrise pour les étudiants...');
            $studentIds = User::where('role', 'student')->pluck('id')->toArray();
            
            $minStudent = min(500, $totalObjects);
            $maxStudent = min(1200, $totalObjects);
            $this->seedMasteryForUsers($studentIds, $anatomyIds, $minStudent/$totalObjects, $maxStudent/$totalObjects, $weightedLevels);

            // --- Enseignants (80 – 90%) ---
            $this->command->info('Génération de la maîtrise pour les enseignants...');
            $teacherIds = User::where('role', 'teacher')->pluck('id')->toArray();
            $this->seedMasteryForUsers($teacherIds, $anatomyIds, 0.80, 0.90, $weightedLevels);

            // --- Admins (2 – 5%) ---
            $this->command->info('Génération de la maîtrise pour les administrateurs...');
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();
            $this->seedMasteryForUsers(
                $adminIds,
                $anatomyIds,
                0.02,
                0.05,
                $weightedLevels
            );
            $this->command->info(count($adminIds) . ' administrateur(s) traité(s).');
        }

        $this->command->info('✅ Données réalistes générées : utilisateurs, labs, vues, maîtrise (étudiants/profs/admins), consultations et avis.');
    }
}
