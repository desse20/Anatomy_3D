<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabParticipant extends Model
{
    use HasUuids;

    protected $table = 'lab_participants';
    public $timestamps = false;

    protected $fillable = [
        'lab_id',
        'user_id',
        'joined_at',
    ];

    public function lab(): BelongsTo
    {
        return $this->belongsTo(Lab::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
