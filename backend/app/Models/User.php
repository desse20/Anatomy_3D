<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids; // Important pour l'UUID
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Mail;
use App\Mail\ResetPasswordMail;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        return $this->hasMany(UserMastery::class, 'student_id');
    }

    /**
     * RELATION : Un enseignant peut créer plusieurs Labs.
     */
    public function labs(): HasMany
    {
        return $this->hasMany(Lab::class, 'teacher_id');
    }

    /**
     * RELATION : Un enseignant peut créer plusieurs SharedViews.
     */
    public function sharedViews(): HasMany
    {
        return $this->hasMany(SharedView::class, 'teacher_id');
    }

    /**
     * RELATION : Un étudiant a plusieurs messages de chat IA.
     */
    public function chats(): HasMany
    {
        return $this->hasMany(Chat::class, 'student_id');
    }

    /**
     * RELATION : Un admin peut avoir des assets 3D.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset3d::class, 'admin_id');
    }

    /**
     * Génère un nouveau token, le hache et le stocke en BD.
     */
    public function generateSimpleToken(): string
    {
        $tokenStr = \Illuminate\Support\Str::random(60);
        
        $this->token = hash('sha256', $tokenStr);
        $this->save();
        
        return base64_encode($this->id) . '.' . $tokenStr;
    }

    /**
     * Invalide le token existant (logout).
     */
    public function invalidateToken(): void
    {
        $this->token = null;
        $this->save();
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