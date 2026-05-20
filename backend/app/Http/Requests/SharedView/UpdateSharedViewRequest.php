<?php

namespace App\Http\Requests\SharedView;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSharedViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $sharedView = $this->route('shared_view');

        return [
            'teacher_id' => ['sometimes', 'uuid', 'exists:users,id'],
            'asset_3d_id' => ['sometimes', 'uuid', 'exists:assets_3d,id'],
            'share_token' => ['sometimes', 'string', 'max:255', Rule::unique('shared_views')->ignore($sharedView->id)],
            'camera_position' => ['sometimes', 'array'],
            'camera_position.x' => ['required_with:camera_position', 'numeric'],
            'camera_position.y' => ['required_with:camera_position', 'numeric'],
            'camera_position.z' => ['required_with:camera_position', 'numeric'],
            'camera_target' => ['sometimes', 'array'],
            'camera_target.x' => ['required_with:camera_target', 'numeric'],
            'camera_target.y' => ['required_with:camera_target', 'numeric'],
            'camera_target.z' => ['required_with:camera_target', 'numeric'],
            'scene_state' => ['nullable', 'array'],
            'teacher_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'teacher_id.uuid' => __('messages.shared_view.teacher_id_uuid'),
            'teacher_id.exists' => __('messages.shared_view.teacher_id_exists'),
            'asset_3d_id.uuid' => __('messages.shared_view.asset_3d_id_uuid'),
            'asset_3d_id.exists' => __('messages.shared_view.asset_3d_id_exists'),
            'share_token.unique' => __('messages.shared_view.token_unique'),
            'camera_position.array' => __('messages.shared_view.camera_pos_array'),
            'camera_target.array' => __('messages.shared_view.camera_target_array'),
            'teacher_note.string' => __('messages.shared_view.note_string'),
            'teacher_note.max' => __('messages.shared_view.note_max'),
        ];
    }
}
