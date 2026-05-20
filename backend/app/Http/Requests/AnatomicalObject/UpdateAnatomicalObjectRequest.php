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
            'parent_id.integer' => __('messages.anatomical_object.parent_id_integer'),
            'parent_id.exists' => __('messages.anatomical_object.parent_id_exists'),
            'name.string' => __('messages.anatomical_object.name_string'),
            'three_js_name.string' => __('messages.anatomical_object.three_js_name_string'),
            'mesh.string' => __('messages.anatomical_object.mesh_string'),
            'description.string' => __('messages.anatomical_object.description_string'),
        ];
    }
}
