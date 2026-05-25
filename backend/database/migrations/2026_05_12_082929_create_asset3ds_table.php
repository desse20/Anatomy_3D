<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('assets_3d', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('url_glb');
            $table->integer('version_cache')->default(1);
            $table->foreignUuid('admin_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('assets_3d');
    }
};
