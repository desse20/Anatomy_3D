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
use App\Models\AnatomicalObject;
use App\Models\Asset3d;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class RealisticMockSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $faker = Faker::create('fr_FR');

        // 1. Generate Admins (Target 5 total)
        $currentAdmins = User::where('role', 'admin')->count();
        for ($i = 0; $i < (5 - $currentAdmins); $i++) {
            User::create([
                'id' => (string) Str::uuid(),
                'firstname' => $faker->firstName,
                'lastname' => $faker->lastName,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'role' => 'admin',
                'created_at' => $faker->dateTimeBetween('-6 months', 'now')
            ]);
        }

        // 2. Generate Teachers (Target 20 total)
        $currentTeachers = User::where('role', 'teacher')->count();
        $allAssets = Asset3d::all();
        
        for ($i = 0; $i < (20 - $currentTeachers); $i++) {
            $teacher = User::create([
                'id' => (string) Str::uuid(),
                'firstname' => $faker->firstName,
                'lastname' => $faker->lastName,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'role' => 'teacher',
                'created_at' => $faker->dateTimeBetween('-6 months', 'now')
            ]);

            $labNames = ['Licence 1 - FSS', 'Licence 2 - FSS', 'Licence 3 - FSS', 'Master 1 - Chirurgie', 'Master 2 - Anatomie', 'L1 - FSS - Parakou', 'L2 - FSS - Parakou', 'Internat FSS', 'UE Anatomie', 'UE Physiologie'];
            
            // Rooms (Labs) for teacher (max 10)
            $hasLabs = $faker->boolean(70); 
            if ($hasLabs) {
                $numLabs = $faker->numberBetween(1, 5); // Reduced max labs per teacher for more realism
                for ($j = 0; $j < $numLabs; $j++) {
                    $descriptions = [
                        'Introduction aux bases de l\'anatomie humaine.',
                        'Étude approfondie du système cardio-vasculaire.',
                        'Analyse des structures osseuses et articulaires.',
                        'Focus sur le système nerveux central et périphérique.',
                        'Examen des organes thoraciques et abdominaux.',
                        'Révision générale des membres supérieurs et inférieurs.',
                        'Séance pratique sur les modèles 3D complexes.'
                    ];
                    $lab = Lab::create([
                        'user_id' => $teacher->id,
                        'name' => $faker->randomElement($labNames) . " - Grp " . $faker->unique()->numberBetween(100, 9999),
                        'description' => $faker->randomElement($descriptions)
                    ]);

                    // Shared Views for this teacher
                    $hasViews = $faker->boolean(60);
                    if ($hasViews && $allAssets->count() > 0) {
                        $numViews = $faker->numberBetween(1, 4);
                        for ($k = 0; $k < $numViews; $k++) {
                                $teacherNotes = [
                                    'Observez bien l\'insertion des tendons sur cette zone.',
                                    'Focus sur la vascularisation de cet organe.',
                                    'Attention à la distinction entre artère et veine ici.',
                                    'Notez la courbure spécifique visible sous cet angle.',
                                    'À mémoriser pour l\'examen de la semaine prochaine.',
                                    'Détails importants sur les structures nerveuses environnantes.',
                                    'Comparez cette vue avec le schéma du cours (page 42).'
                                ];
                                $view = SharedView::create([
                                    'user_id' => $teacher->id,
                                    'asset_3d_id' => $allAssets->random()->id,
                                    'status' => 'visible',
                                    'camera_position' => ['x' => rand(0, 10), 'y' => rand(0, 10), 'z' => rand(0, 10)],
                                    'camera_target' => ['x' => 0, 'y' => 0, 'z' => 0],
                                    'scene_state' => [],
                                    'teacher_note' => $faker->optional(0.8)->randomElement($teacherNotes)
                                ]);

                            if ($faker->boolean(50)) {
                                LabSharedView::create([
                                    'lab_id' => $lab->id,
                                    'shared_view_id' => $view->id
                                ]);
                            }
                        }
                    }
                }
            }
        }

        // 3. Generate Students (Target 130 total)
        $currentStudents = User::where('role', 'student')->count();
        $allLabs = Lab::all();
        $allAnatomy = AnatomicalObject::all();

        for ($i = 0; $i < (130 - $currentStudents); $i++) {
            $student = User::create([
                'id' => (string) Str::uuid(),
                'firstname' => $faker->firstName,
                'lastname' => $faker->lastName,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'role' => 'student',
                'created_at' => $faker->dateTimeBetween('-6 months', 'now')
            ]);

            // Participate in labs
            if ($allLabs->count() > 0) {
                $myLabs = $allLabs->random($faker->numberBetween(0, min(5, $allLabs->count())));
                foreach ($myLabs as $lab) {
                    LabParticipant::create([
                        'lab_id' => $lab->id,
                        'user_id' => $student->id,
                        'joined_at' => $faker->dateTimeBetween('-1 month', 'now')
                    ]);
                }
            }

            // Mastery Levels on anatomical objects
            if ($allAnatomy->count() > 0) {
                $objects = $allAnatomy->random($faker->numberBetween(3, 10));
                foreach ($objects as $obj) {
                    UserMastery::create([
                        'user_id' => $student->id,
                        'anatomical_object_id' => $obj->id,
                        'success_count' => $faker->numberBetween(1, 20),
                        'failure_count' => $faker->numberBetween(0, 5),
                        'mastery_level' => $faker->numberBetween(1, 5),
                        'last_review_at' => $faker->dateTimeBetween('-1 month', 'now'),
                        'next_review_at' => $faker->dateTimeBetween('now', '+1 month')
                    ]);
                }
            }
        }

        // 4. Generate 100 Reviews (Avis)
        $allUsers = User::all();
        $types = ['platform', 'model_3d', 'object'];

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
            'Superbe rendu visuel, très réaliste !'
        ];

        for ($i = 0; $i < 100; $i++) {
            Review::create([
                'user_id' => $allUsers->random()->id,
                'type' => $faker->randomElement($types),
                'rating' => $faker->numberBetween(4, 5), // Reviews reflect user satisfaction
                'comment' => $faker->optional(0.9)->randomElement($reviewComments)
            ]);
        }

        $this->command->info('Realistic mock data generated: 130+ users, labs, views, masteries and 100 reviews.');
    }
}
