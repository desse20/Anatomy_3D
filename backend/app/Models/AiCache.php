<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiCache extends Model
{
    use HasUuids;

    protected $table = 'ai_cache';
    public $timestamps = false;

    protected $fillable = [
        'question',
        'response',
        'language',   // 'fr' | 'en'
        'use_count',
        'object_id',  // nullable — contexte anatomique
        'ai_model',   // ex: 'phi3:latest'
        'expires_at',
    ];

    protected $casts = [
        'use_count'  => 'integer',
        'object_id'  => 'integer',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Contexte anatomique lié à la question (nullable).
     */
    public function anatomicalObject(): BelongsTo
    {
        return $this->belongsTo(AnatomicalObject::class, 'object_id');
    }

    /**
     * Vérifie si l'entrée de cache est encore valide (non expirée).
     */
    public function isValid(): bool
    {
        if (is_null($this->expires_at)) {
            return true; // NULL = n'expire jamais
        }
        return $this->expires_at->isFuture();
    }
}
