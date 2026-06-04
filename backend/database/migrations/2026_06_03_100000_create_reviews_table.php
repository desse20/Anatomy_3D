<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            // 'platform' = avis global sur la plateforme (bugs, chargement, etc.)
            // 'object'   = avis sur un objet anatomique (et son modèle par déduction)
            $table->enum('type', ['platform', 'object', 'model_3d']);
            $table->tinyInteger('rating'); // 1 à 5
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void {
        Schema::dropIfExists('reviews');
    }
};
