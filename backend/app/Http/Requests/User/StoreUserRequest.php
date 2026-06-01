<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;
use App\Enums\UserRole;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()->letters()->numbers()->symbols()],
            'role' => ['required', 'string', 'in:admin,teacher,student'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstname.required' => __('messages.auth.firstname_required'),
            'lastname.required' => __('messages.auth.lastname_required'),
            'email.required' => __('messages.auth.email_required'),
            'email.email' => __('messages.auth.email_valid'),
            'email.unique' => __('messages.auth.email_unique'),
            'password.required' => __('messages.auth.password_required'),
            'password.min' => __('messages.auth.password_min'),
            'password.confirmed' => __('messages.auth.password_confirmed'),
            'role.required' => __('messages.auth.role_required'),
            'role.in' => __('messages.auth.role_invalid'),
        ];
    }
}
