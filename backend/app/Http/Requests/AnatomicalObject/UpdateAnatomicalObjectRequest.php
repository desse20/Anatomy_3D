<?php

namespace App\Http\Requests\AnatomicalObject;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnatomicalObjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $anatomicalObject = $this->route('anatomical_object');

        return [
            'parent_id' => ['nullable', 'integer', 'exists:anatomical_objects,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'three_js_name' => ['sometimes', 'string', 'max:255'],
            'mesh' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'parent_id.integer' => 'L\'ID parent doit être un entier.',
            'parent_id.exists' => 'L\'objet parent spécifié n\'existe pas.',
            'name.string' => 'Le nom doit être une chaîne de caractères.',
            'three_js_name.string' => 'Le nom Three.js doit être une chaîne de caractères.',
            'mesh.string' => 'Le mesh doit être une chaîne de caractères.',
            'description.string' => 'La description doit être une chaîne de caractères.',
        ];
    }
}
