<?php

namespace App\Http\Requests\AnatomicalObject;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnatomicalObjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'integer', 'unique:anatomical_objects,id'],
            'parent_id' => ['nullable', 'integer', 'exists:anatomical_objects,id'],
            'name' => ['required', 'string', 'max:255'],
            'three_js_name' => ['required', 'string', 'max:255'],
            'mesh' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'L\'ID de l\'objet anatomique est obligatoire.',
            'id.integer' => 'L\'ID doit être un entier.',
            'id.unique' => 'Cet ID est déjà utilisé.',
            'parent_id.integer' => 'L\'ID parent doit être un entier.',
            'parent_id.exists' => 'L\'objet parent spécifié n\'existe pas.',
            'name.required' => 'Le nom est obligatoire.',
            'three_js_name.required' => 'Le nom Three.js est obligatoire.',
            'mesh.string' => 'Le mesh doit être une chaîne de caractères.',
            'description.string' => 'La description doit être une chaîne de caractères.',
        ];
    }
}
