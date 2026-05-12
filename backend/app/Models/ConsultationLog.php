<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultationLog extends Model
{
    use HasUuids;

    // Désactiver les timestamps standards si tu n'utilises que viewed_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'anatomical_object_id',
        'viewed_at'
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