<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('lab_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lab_id')->constrained('labs')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            
            // Un étudiant ne peut participer qu'une fois à la même salle
            $table->unique(['lab_id', 'user_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('lab_participants');
    }
};
