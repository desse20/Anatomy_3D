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
        'type',       // 'platform' | 'model_3d' | 'object'
        'rating',     // 1 to 5
        'comment',
    ];

    protected $casts = [
        'rating'     => 'integer',
        'created_at' => 'datetime',
    ];

    /** Auteur de l'avis */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
