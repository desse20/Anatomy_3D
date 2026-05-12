<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('assets_3d', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->string('url_glb');
        $table->integer('version_cache')->default(1);
        $table->uuid('admin_id');
        $table->foreign('admin_id')->references('id')->on('users');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets_3d');
    }
};
