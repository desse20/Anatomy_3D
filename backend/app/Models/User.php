<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids; // Important pour l'UUID
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Mail;
use App\Mail\ResetPasswordMail;
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

    public function generateSimpleToken(): string
    {
        $hmac = hash_hmac('sha256', $this->id . $this->email, config('app.key'));
        return base64_encode($this->id) . '.' . $hmac;
    }

    /**
     * Personnalise le lien de réinitialisation de mot de passe.
     */
    public function sendPasswordResetNotification($token): void
    {
        $url = 'http://localhost:5173/password-reset?token=' . $token . '&email=' . $this->email;
        Mail::to($this->email)->send(new ResetPasswordMail($this->firstname, $url));
    }
}