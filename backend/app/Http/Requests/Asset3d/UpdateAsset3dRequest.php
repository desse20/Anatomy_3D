<?php

namespace App\Http\Requests\Asset3d;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAsset3dRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'url_glb' => ['sometimes', 'string', 'url', 'max:500'],
            'version_cache' => ['sometimes', 'integer', 'min:1'],
            'admin_id' => ['sometimes', 'uuid', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'url_glb.url' => 'L\'URL doit être une adresse URL valide.',
            'version_cache.integer' => 'La version du cache doit être un entier.',
            'version_cache.min' => 'La version du cache doit être au moins 1.',
            'admin_id.uuid' => 'L\'ID de l\'administrateur doit être un UUID valide.',
            'admin_id.exists' => 'L\'administrateur spécifié n\'existe pas.',
        ];
    }
}
