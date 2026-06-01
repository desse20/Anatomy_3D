<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SharedView extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'status',
        'camera_position',
        'camera_target',
        'scene_state',
        'teacher_note',
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
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relation : Cette SharedView peut être associée à plusieurs Labs via pivot.
     */
    public function labSharedViews(): HasMany
    {
        return $this->hasMany(LabSharedView::class, 'shared_view_id');
    }

    /**
     * Relation : Labs qui contiennent cette vue.
     */
    public function labs()
    {
        return $this->belongsToMany(
            Lab::class,
            'lab_shared_views',
            'shared_view_id',
            'lab_id'
        );
    }
}