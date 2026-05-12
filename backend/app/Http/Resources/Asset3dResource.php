<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class Asset3dResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url_glb' => $this->url_glb,
            'version_cache' => $this->version_cache,
            'admin_id' => $this->admin_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Relations incluses si chargées
            'admin' => UserResource::make($this->whenLoaded('admin')),
            'shared_views_count' => $this->whenCounted('sharedViews'),
            'shared_views' => SharedViewResource::collection($this->whenLoaded('sharedViews')),
        ];
    }
}
