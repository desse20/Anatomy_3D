<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class StoreLabRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('messages.lab.name_required'),
            'name.string'   => __('messages.lab.name_string'),
            'name.max'      => __('messages.lab.name_max'),
            'description.string' => __('messages.lab.description_string'),
            'description.max'    => __('messages.lab.description_max'),
        ];
    }
}
