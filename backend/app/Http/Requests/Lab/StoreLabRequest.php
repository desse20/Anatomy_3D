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
            'name'        => ['required', 'string', 'max:255', 'unique:labs,name'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de la salle est obligatoire.',
            'name.unique'   => 'Une salle portant ce nom existe déjà.',
            'name.string'   => 'Le nom doit être une chaîne de caractères.',
            'name.max'      => 'Le nom est trop long.',
            'description.string' => __('messages.lab.description_string'),
            'description.max'    => __('messages.lab.description_max'),
        ];
    }
}
