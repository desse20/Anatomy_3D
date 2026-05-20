<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class LogoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::check();
    }

    public function rules(): array
    {
        return [];
    }

    public function fulfill(): void
    {
        $user = $this->user();
        
        // Invalide le token HMAC en incrémentant la version
        if ($user) {
            $user->invalidateToken();
        }

        Auth::logout();

        request()->session()->invalidate();

        request()->session()->regenerateToken();
    }
}
