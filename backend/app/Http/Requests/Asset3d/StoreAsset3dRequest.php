<?php

namespace App\Http\Requests\Asset3d;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAsset3dRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'url_glb' => ['required', 'string', 'url', 'max:500'],
            'version_cache' => ['required', 'integer', 'min:1'],
            'admin_id' => ['required', 'uuid', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'url_glb.required' => __('messages.asset_3d.url_required'),
            'url_glb.url' => __('messages.asset_3d.url_invalid'),
            'version_cache.required' => __('messages.asset_3d.version_required'),
            'version_cache.integer' => __('messages.asset_3d.version_integer'),
            'version_cache.min' => __('messages.asset_3d.version_min'),
            'admin_id.required' => __('messages.asset_3d.admin_id_required'),
            'admin_id.uuid' => __('messages.asset_3d.admin_id_uuid'),
            'admin_id.exists' => __('messages.asset_3d.admin_id_exists'),
        ];
    }
}
