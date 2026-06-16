<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firstname' => ['sometimes', 'string', 'max:255'],
            'lastname' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($this->route('user') ?? auth()->id())],
            'role' => ['sometimes', 'string', 'in:admin,teacher,student'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstname.string' => __('messages.auth.firstname_string'),
            'lastname.string' => __('messages.auth.lastname_string'),
            'email.email' => __('messages.auth.email_valid'),
            'email.unique' => __('messages.auth.email_unique'),
            'password.min' => __('messages.auth.password_min'),
            'password.confirmed' => __('messages.auth.password_confirmed'),
            'role.in' => __('messages.auth.role_invalid'),
        ];
    }
}
