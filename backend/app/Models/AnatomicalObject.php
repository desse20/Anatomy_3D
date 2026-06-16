<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnatomicalObject extends Model
{
    // L'ID n'est pas auto-incrémenté car il vient de Blender
    public $incrementing = false;
    protected $keyType = 'int';
    public $timestamps = true;

    protected $fillable = [
        'id',
        'parent_id',
        'asset_3d_id',
        'name',
        'three_js_name',
        'mesh',
        'description',
    ];

    /**
     * name et description sont stockés en JSON multilingue :
     * { "en": "Clavicle", "fr": "Clavicule" }
     */
    protected $casts = [
        'name'        => 'array',
        'description' => 'array',
    ];

    /**
     * Retourne le nom dans la langue demandée (fr par défaut, fallback en).
     */
    public function getName(string $locale = 'fr'): string
    {
        $name = $this->name;
        if (is_array($name)) {
            return $name[$locale] ?? $name['en'] ?? $name['fr'] ?? '';
        }
        return (string) $name;
    }

    /**
     * Retourne la description dans la langue demandée.
     */
    public function getDescription(string $locale = 'fr'): string
    {
        $desc = $this->description;
        if (is_array($desc)) {
            return $desc[$locale] ?? $desc['en'] ?? $desc['fr'] ?? '';
        }
        return (string) $desc;
    }

    // Relation récursive : un objet peut avoir un parent (ex: Main -> Poignet)
    public function parent(): BelongsTo
    {
        return $this->belongsTo(AnatomicalObject::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(AnatomicalObject::class, 'parent_id');
    }

    /**
     * Relation : Cet objet anatomique appartient à un Asset 3D.
     */
    public function asset3d(): BelongsTo
    {
        return $this->belongsTo(Asset3d::class, 'asset_3d_id');
    }

    /**
     * Relation : Historique de maîtrise des étudiants sur cet objet.
     */
    public function masteries(): HasMany
    {
        return $this->hasMany(UserMastery::class, 'anatomical_object_id');
    }
}