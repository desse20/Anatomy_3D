<?php

namespace App\Http\Requests\SharedView;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSharedViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'teacher_id' => ['required', 'uuid', 'exists:users,id'],
            'asset_3d_id' => ['required', 'uuid', 'exists:assets_3d,id'],
            'share_token' => ['required', 'string', 'max:255', 'unique:shared_views,share_token'],
            'camera_position' => ['required', 'array'],
            'camera_position.x' => ['required', 'numeric'],
            'camera_position.y' => ['required', 'numeric'],
            'camera_position.z' => ['required', 'numeric'],
            'camera_target' => ['required', 'array'],
            'camera_target.x' => ['required', 'numeric'],
            'camera_target.y' => ['required', 'numeric'],
            'camera_target.z' => ['required', 'numeric'],
            'scene_state' => ['nullable', 'array'],
            'teacher_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'teacher_id.required' => 'L\'ID de l\'enseignant est obligatoire.',
            'teacher_id.uuid' => 'L\'ID de l\'enseignant doit être un UUID valide.',
            'teacher_id.exists' => 'L\'enseignant spécifié n\'existe pas.',
            'asset_3d_id.required' => 'L\'ID de l\'asset 3D est obligatoire.',
            'asset_3d_id.uuid' => 'L\'ID de l\'asset 3D doit être un UUID valide.',
            'asset_3d_id.exists' => 'L\'asset 3D spécifié n\'existe pas.',
            'share_token.required' => 'Le token de partage est obligatoire.',
            'share_token.unique' => 'Ce token de partage est déjà utilisé.',
            'camera_position.required' => 'La position de la caméra est obligatoire.',
            'camera_position.array' => 'La position de la caméra doit être un tableau.',
            'camera_target.required' => 'La cible de la caméra est obligatoire.',
            'camera_target.array' => 'La cible de la caméra doit être un tableau.',
            'teacher_note.string' => 'La note de l\'enseignant doit être une chaîne de caractères.',
            'teacher_note.max' => 'La note de l\'enseignant ne doit pas dépasser 1000 caractères.',
        ];
    }
}
