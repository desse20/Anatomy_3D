<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('user_mastery', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('anatomical_object_id');
            $table->foreign('anatomical_object_id')->references('id')->on('anatomical_objects')->cascadeOnDelete();
            $table->integer('success_count')->default(0);
            $table->integer('failure_count')->default(0);
            $table->integer('mastery_level')->default(0);
            $table->timestamp('next_review_at')->nullable();
            $table->timestamp('last_review_at')->nullable();
        });
    }
    public function down(): void {
        Schema::dropIfExists('user_mastery');
    }
};
