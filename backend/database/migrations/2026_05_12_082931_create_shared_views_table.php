<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shared_views', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('teacher_id')->constrained('users');
            $table->foreignUuid('asset_3d_id')->constrained('assets_3d');
            
            $table->string('share_token', 100)->unique();
            
            // Stockage des vecteurs et états sous forme JSON
            $table->json('camera_position'); // {x: 1.2, y: 0.5, z: 2.0}
            $table->json('camera_target');   // {x: 0, y: 0, z: 0}
            $table->json('scene_state');     // {hidden_ids: [1, 5], highlighted_ids: [12]}
            
            $table->text('teacher_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shared_views');
    }
};