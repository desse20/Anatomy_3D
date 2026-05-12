<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'firstname' => $this->firstname,
            'lastname' => $this->lastname,
            'email' => $this->email,
            'role' => $this->role,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Relations incluses si chargées
            'consultation_logs_count' => $this->whenCounted('consultationLogs'),
            'masteries_count' => $this->whenCounted('masteries'),
            
            // Relations complètes si demandées
            'consultation_logs' => ConsultationLogResource::collection($this->whenLoaded('consultationLogs')),
            'masteries' => UserMasteryResource::collection($this->whenLoaded('masteries')),
            
            // Informations d'authentification
            'token' => $this->when($this->token, $this->token),
            'abilities' => $this->when($this->abilities, $this->abilities),
        ];
    }
}
