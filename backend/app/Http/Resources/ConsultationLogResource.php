<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConsultationLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'anatomical_object_id' => $this->anatomical_object_id,
            'viewed_at' => $this->viewed_at,
            
            // Relations incluses si chargées
            'user' => UserResource::make($this->whenLoaded('user')),
            'anatomical_object' => AnatomicalObjectResource::make($this->whenLoaded('anatomicalObject')),
        ];
    }
}
