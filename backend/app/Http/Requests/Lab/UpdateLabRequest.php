<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLabRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['sometimes', 'required', 'string', 'max:255', 'unique:labs,name,'.$this->lab->id],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('messages.lab.name_required'),
            'name.unique'   => __('messages.lab.name_unique'),
            'name.string'   => __('messages.lab.name_string'),
            'name.max'      => __('messages.lab.name_max'),
        ];
    }
}
