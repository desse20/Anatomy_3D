<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Administrateur
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'firstname' => 'Admin',
                'lastname' => 'System',
                'password' => Hash::make('admin'), // Mot de passe "admin"
                'role' => 'admin'
            ]
        );

        // Enseignant (Teacher)
        User::updateOrCreate(
            ['email' => 'teacher@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'firstname' => 'Prof',
                'lastname' => 'Teacher',
                'password' => Hash::make('teacher'),
                'role' => 'teacher'
            ]
        );

        // Étudiant (Student)
        User::updateOrCreate(
            ['email' => 'student@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'firstname' => 'Jean',
                'lastname' => 'Student',
                'password' => Hash::make('student'), // Mot de passe "student"
                'role' => 'student'
            ]
        );

        $this->command->info('Users seeded: Admin (admin@gmail.com), Teacher (teacher@gmail.com) and Student (student@gmail.com)');
    }
}
