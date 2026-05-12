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
        Schema::create('anatomical_objects', function (Blueprint $table) {
        $table->integer('id')->primary(); 
        $table->integer('parent_id')->nullable();
        $table->string('name');
        $table->string('three_js_name'); 
        $table->string('mesh')->nullable();     
        $table->text('description');
        $table->timestamps();

        $table->foreign('parent_id')->references('id')->on('anatomical_objects');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('anatomical_objects');
    }
};
