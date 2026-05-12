<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnatomicalObject extends Model
{
    // L'ID n'est pas auto-incrémenté car il vient de Blender
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'id',
        'parent_id',
        'name',
        'three_js_name',
        'mesh',
        'description'
    ];

    // Relation récursive : un objet peut avoir un parent (ex: Main -> Poignet)
    public function parent(): BelongsTo
    {
        return $this->belongsTo(AnatomicalObject::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(AnatomicalObject::class, 'parent_id');
    }
}