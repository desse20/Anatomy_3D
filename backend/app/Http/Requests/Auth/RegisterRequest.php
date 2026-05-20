<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'password' => ['required', 'confirmed', Password::defaults()],
            // Le rôle n'est PAS accepté à l'inscription publique (sécurité anti-escalade)
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
            'password.confirmed' => __('messages.auth.password_confirmed'),
            'role.in' => __('messages.auth.role_invalid'),
        ];
    }
}
