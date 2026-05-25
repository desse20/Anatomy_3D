<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('anatomical_objects', function (Blueprint $table) {
            $table->integer('id')->primary(); // ID fixe issu de ton JSON Blender
            $table->integer('parent_id')->nullable();
            $table->foreign('parent_id')->references('id')->on('anatomical_objects')->nullOnDelete();
            $table->foreignUuid('asset_3d_id')->constrained('assets_3d')->cascadeOnDelete();
            $table->string('name');
            $table->string('three_js_name');
            $table->string('mesh')->nullable();
            $table->text('description')->nullable();
        });
    }
    public function down(): void {
        Schema::dropIfExists('anatomical_objects');
    }
};
