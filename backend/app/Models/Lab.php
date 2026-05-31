<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lab extends Model
{
    use HasUuids;

    public $timestamps = true;

    protected $fillable = [
        'teacher_id',
        'name',
        'description',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function labSharedViews(): HasMany
    {
        return $this->hasMany(LabSharedView::class, 'lab_id');
    }

    public function sharedViews()
    {
        return $this->belongsToMany(
            SharedView::class,
            'lab_shared_views',
            'lab_id',
            'shared_view_id'
        );
    }

    public function participants()
    {
        return $this->belongsToMany(
            User::class,
            'lab_participants',
            'lab_id',
            'user_id'
        )->withPivot('joined_at');
    }
}
