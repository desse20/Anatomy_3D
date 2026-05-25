<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lab extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'teacher_id',
        'name',
        'description',
    ];

    /**
     * Relation : Un lab appartient à un enseignant.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Relation : Un lab peut être associé à plusieurs SharedViews via la table pivot.
     */
    public function labSharedViews(): HasMany
    {
        return $this->hasMany(LabSharedView::class, 'lab_id');
    }

    /**
     * Relation : SharedViews appartenant à ce lab (via pivot).
     */
    public function sharedViews()
    {
        return $this->belongsToMany(
            SharedView::class,
            'lab_shared_views',
            'lab_id',
            'shared_view_id'
        );
    }
}
