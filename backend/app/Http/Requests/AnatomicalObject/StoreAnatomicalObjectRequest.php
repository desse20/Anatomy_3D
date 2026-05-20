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
            'id.required' => __('messages.anatomical_object.id_required'),
            'id.integer' => __('messages.anatomical_object.id_integer'),
            'id.unique' => __('messages.anatomical_object.id_unique'),
            'parent_id.integer' => __('messages.anatomical_object.parent_id_integer'),
            'parent_id.exists' => __('messages.anatomical_object.parent_id_exists'),
            'name.required' => __('messages.anatomical_object.name_required'),
            'three_js_name.required' => __('messages.anatomical_object.three_js_name_required'),
            'mesh.string' => __('messages.anatomical_object.mesh_string'),
            'description.string' => __('messages.anatomical_object.description_string'),
        ];
    }
}
