<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('consultation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('anatomical_object_id');
            $table->foreign('anatomical_object_id')->references('id')->on('anatomical_objects')->cascadeOnDelete();
            $table->timestamp('viewed_at')->nullable();
        });
    }

    public function down(): void {
        Schema::dropIfExists('consultation_logs');
    }
};
