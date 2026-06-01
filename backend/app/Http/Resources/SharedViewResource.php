<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SharedViewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'asset_3d_id' => $this->asset_3d_id,
            'share_token' => $this->share_token,
            'camera_position' => $this->camera_position,
            'camera_target' => $this->camera_target,
            'scene_state' => $this->scene_state,
            'teacher_note' => $this->teacher_note,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Relations incluses si chargées
            'teacher' => UserResource::make($this->whenLoaded('teacher')),
            'asset' => Asset3dResource::make($this->whenLoaded('asset')),
        ];
    }
}
