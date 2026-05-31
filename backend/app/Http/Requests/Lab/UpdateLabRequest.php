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
            'name.required' => 'Le nom de la salle est obligatoire.',
            'name.unique'   => 'Une autre salle porte déjà ce nom.',
            'name.string'   => 'Le nom doit être une chaîne de caractères.',
            'name.max'      => 'Le nom est trop long.',
        ];
    }
}
