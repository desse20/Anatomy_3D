<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asset3d extends Model
{
    use HasUuids;

    protected $fillable = [
        'url_glb',
        'version_cache',
        'admin_id'
    ];

    // Relation : Un asset appartient à un administrateur (User)
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}