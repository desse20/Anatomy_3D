<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnatomicalObjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'three_js_name' => $this->three_js_name,
            'mesh' => $this->mesh,
            'description' => $this->description,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Relations incluses si chargées
            'parent' => AnatomicalObjectResource::make($this->whenLoaded('parent')),
            'children' => AnatomicalObjectResource::collection($this->whenLoaded('children')),
            'children_count' => $this->whenCounted('children'),

            // Statistiques
            'consultation_logs_count' => $this->whenCounted('consultationLogs'),
            'masteries_count' => $this->whenCounted('masteries'),
            'consultation_logs' => ConsultationLogResource::collection($this->whenLoaded('consultationLogs')),
            'masteries' => UserMasteryResource::collection($this->whenLoaded('masteries')),
        ];
    }
}
