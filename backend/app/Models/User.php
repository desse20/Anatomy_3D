<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids; // Important pour l'UUID
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasUuids; // On ajoute HasUuids ici

    // On indique que l'ID n'est pas un entier auto-incrémenté
    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * Les attributs qui peuvent être assignés en masse.
     */
    protected $fillable = [
        'firstname',
        'lastname',
        'email',
        'password',
        'role',
    ];

    /**
     * Les attributs qui doivent être cachés pour la sérialisation (API).
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Le cast des attributs.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * RELATION : Un utilisateur peut avoir plusieurs logs de consultation.
     */
    public function consultationLogs(): HasMany
    {
        return $this->hasMany(ConsultationLog::class);
    }

    /**
     * RELATION : Un étudiant a plusieurs suivis de maîtrise (mastery).
     */
    public function masteries(): HasMany
    {
        return $this->hasMany(UserMastery::class);
    }
}