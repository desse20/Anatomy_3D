<?php

namespace App\Http\Requests\SharedView;

use Illuminate\Foundation\Http\FormRequest;

class StoreSharedViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'camera_position' => ['required', 'array'],
            'camera_position.x' => ['required', 'numeric'],
            'camera_position.y' => ['required', 'numeric'],
            'camera_position.z' => ['required', 'numeric'],
            'camera_target' => ['required', 'array'],
            'camera_target.x' => ['required', 'numeric'],
            'camera_target.y' => ['required', 'numeric'],
            'camera_target.z' => ['required', 'numeric'],
            'asset_3d_id' => ['required', 'uuid', 'exists:assets_3d,id'],
            'scene_state' => ['nullable', 'array'],
            'teacher_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'camera_position.required' => __('messages.shared_view.camera_pos_required'),
            'camera_position.array' => __('messages.shared_view.camera_pos_array'),
            'camera_target.required' => __('messages.shared_view.camera_target_required'),
            'camera_target.array' => __('messages.shared_view.camera_target_array'),
            'teacher_note.string' => __('messages.shared_view.note_string'),
            'teacher_note.max' => __('messages.shared_view.note_max'),
        ];
    }
}
