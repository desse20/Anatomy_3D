<?php

namespace App\Http\Requests\SharedView;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSharedViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $sharedView = $this->route('shared_view');

        return [
            'teacher_id' => ['sometimes', 'uuid', 'exists:users,id'],
            'asset_3d_id' => ['sometimes', 'uuid', 'exists:assets_3d,id'],
            'share_token' => ['sometimes', 'string', 'max:255', Rule::unique('shared_views')->ignore($sharedView->id)],
            'camera_position' => ['sometimes', 'array'],
            'camera_position.x' => ['required_with:camera_position', 'numeric'],
            'camera_position.y' => ['required_with:camera_position', 'numeric'],
            'camera_position.z' => ['required_with:camera_position', 'numeric'],
            'camera_target' => ['sometimes', 'array'],
            'camera_target.x' => ['required_with:camera_target', 'numeric'],
            'camera_target.y' => ['required_with:camera_target', 'numeric'],
            'camera_target.z' => ['required_with:camera_target', 'numeric'],
            'scene_state' => ['nullable', 'array'],
            'teacher_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'teacher_id.uuid' => 'L\'ID de l\'enseignant doit être un UUID valide.',
            'teacher_id.exists' => 'L\'enseignant spécifié n\'existe pas.',
            'asset_3d_id.uuid' => 'L\'ID de l\'asset 3D doit être un UUID valide.',
            'asset_3d_id.exists' => 'L\'asset 3D spécifié n\'existe pas.',
            'share_token.unique' => 'Ce token de partage est déjà utilisé.',
            'camera_position.array' => 'La position de la caméra doit être un tableau.',
            'camera_target.array' => 'La cible de la caméra doit être un tableau.',
            'teacher_note.string' => 'La note de l\'enseignant doit être une chaîne de caractères.',
            'teacher_note.max' => 'La note de l\'enseignant ne doit pas dépasser 1000 caractères.',
        ];
    }
}
