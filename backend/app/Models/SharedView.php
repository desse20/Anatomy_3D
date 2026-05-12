<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedView extends Model
{
    use HasUuids;

    protected $fillable = [
        'teacher_id',
        'asset_3d_id',
        'share_token',
        'camera_position',
        'camera_target',
        'scene_state',
        'teacher_note'
    ];

    /**
     * Casting automatique des colonnes JSON en tableaux PHP.
     */
    protected $casts = [
        'camera_position' => 'array',
        'camera_target'   => 'array',
        'scene_state'     => 'array',
    ];

    /**
     * Relation : La vue a été créée par un enseignant.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Relation : La vue pointe vers un modèle 3D spécifique.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset3d::class, 'asset_3d_id');
    }
}