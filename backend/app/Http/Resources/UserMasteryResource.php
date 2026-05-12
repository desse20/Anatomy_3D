<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserMasteryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'anatomical_object_id' => $this->anatomical_object_id,
            'success_count' => $this->success_count,
            'failure_count' => $this->failure_count,
            'mastery_level' => $this->mastery_level,
            'next_review_at' => $this->next_review_at,
            'last_review_at' => $this->last_review_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Relations incluses si chargées
            'user' => UserResource::make($this->whenLoaded('user')),
            'anatomical_object' => AnatomicalObjectResource::make($this->whenLoaded('anatomicalObject')),
            
            // Calculs utiles
            'total_attempts' => $this->success_count + $this->failure_count,
            'success_rate' => $this->when($this->success_count + $this->failure_count > 0, 
                round(($this->success_count / ($this->success_count + $this->failure_count)) * 100, 2)
            ),
            'is_due_for_review' => $this->when($this->next_review_at, 
                $this->next_review_at->isPast()
            ),
        ];
    }
}
