<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('shared_views', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('asset_3d_id')->constrained('assets_3d')->cascadeOnDelete();
            $table->enum('status', ['visible', 'hidden'])->default('hidden');
            $table->json('camera_position');
            $table->json('camera_target');
            $table->json('scene_state');
            $table->text('teacher_note')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void {
        Schema::dropIfExists('shared_views');
    }
};