<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('ai_cache', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('question');
            $table->longText('response');
            // Langue dans laquelle la réponse a été générée
            $table->enum('language', ['fr', 'en'])->default('fr');
            // Nombre de fois que cette réponse a été réutilisée (mode hors ligne)
            $table->integer('use_count')->default(0);
            // Contexte anatomique de la question (nullable = question générale)
            $table->integer('object_id')->nullable();
            $table->foreign('object_id')->references('id')->on('anatomical_objects')->cascadeOnDelete();
            // Modèle IA qui a généré la réponse (ex: phi3:latest)
            $table->string('ai_model', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();
            // NULL = n'expire jamais
            $table->timestamp('expires_at')->nullable();
        });
    }

    public function down(): void {
        Schema::dropIfExists('ai_cache');
    }
};
