<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMastery extends Model
{
    use HasUuids;

    protected $table = 'user_mastery'; // Précisé car le pluriel automatique peut différer

    protected $fillable = [
        'user_id',
        'anatomical_object_id',
        'success_count',
        'failure_count',
        'mastery_level',
        'next_review_at',
        'last_review_at'
    ];

    // Cast des dates pour manipulation facile avec Carbon
    protected $casts = [
        'next_review_at' => 'datetime',
        'last_review_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function anatomicalObject(): BelongsTo
    {
        return $this->belongsTo(AnatomicalObject::class);
    }
}