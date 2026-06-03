<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasUuids;

    // Pas de updated_at — on ne track que la création
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'type',       // 'platform' | 'object'
        'object_id',  // nullable — NULL si type = 'platform'
        'rating',     // 1 à 5
        'comment',
    ];

    protected $casts = [
        'rating'     => 'integer',
        'object_id'  => 'integer',
        'created_at' => 'datetime',
    ];

    /** Auteur de l'avis */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Objet anatomique concerné (nullable).
     * Via anatomical_objects.asset_3d_id on peut retrouver le modèle 3D.
     */
    public function anatomicalObject(): BelongsTo
    {
        return $this->belongsTo(AnatomicalObject::class, 'object_id');
    }
}
