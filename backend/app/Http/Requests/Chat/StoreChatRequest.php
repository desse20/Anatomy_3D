<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class StoreChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Géré par le middleware simple_auth
    }

    public function rules(): array
    {
        return [
            'input'           => ['required', 'string', 'max:15000'],
            'conversation_id' => ['nullable', 'uuid'],
            'model'           => ['nullable', 'string', 'max:100'],
            'bone'            => ['nullable', 'string', 'max:255'],
            'type'            => ['nullable', 'string', 'in:explain,quiz'],
        ];
    }

    public function messages(): array
    {
        return [
            'input.required'           => __('messages.chat.input_required'),
            'input.string'             => __('messages.chat.input_string'),
            'input.max'                => __('messages.chat.input_max'),
            'conversation_id.uuid'     => __('messages.chat.group_uuid'),
            'type.in'                  => __('messages.chat.type_in'),
        ];
    }
}
