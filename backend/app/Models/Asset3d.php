<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset3d extends Model
{
    use HasUuids;

    protected $table = 'assets_3d';

    protected $fillable = [
        'name',
        'url_glb',
        'version_cache',
        'admin_id'
    ];

    // Relation : Un asset appartient à un administrateur (User)
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    // Relation : Un asset contient plusieurs objets anatomiques
    public function anatomicalObjects(): HasMany
    {
        return $this->hasMany(AnatomicalObject::class, 'asset_3d_id');
    }

    // Relation : Un asset peut avoir plusieurs vues sauvegardées
    public function sharedViews(): HasMany
    {
        return $this->hasMany(SharedView::class, 'asset_3d_id');
    }
}