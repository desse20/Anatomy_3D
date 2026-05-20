<?php

namespace App\Http\Requests\SharedView;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSharedViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'teacher_id' => ['required', 'uuid', 'exists:users,id'],
            'asset_3d_id' => ['required', 'uuid', 'exists:assets_3d,id'],
            'share_token' => ['required', 'string', 'max:255', 'unique:shared_views,share_token'],
            'camera_position' => ['required', 'array'],
            'camera_position.x' => ['required', 'numeric'],
            'camera_position.y' => ['required', 'numeric'],
            'camera_position.z' => ['required', 'numeric'],
            'camera_target' => ['required', 'array'],
            'camera_target.x' => ['required', 'numeric'],
            'camera_target.y' => ['required', 'numeric'],
            'camera_target.z' => ['required', 'numeric'],
            'scene_state' => ['nullable', 'array'],
            'teacher_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'teacher_id.required' => __('messages.shared_view.teacher_id_required'),
            'teacher_id.uuid' => __('messages.shared_view.teacher_id_uuid'),
            'teacher_id.exists' => __('messages.shared_view.teacher_id_exists'),
            'asset_3d_id.required' => __('messages.shared_view.asset_3d_id_required'),
            'asset_3d_id.uuid' => __('messages.shared_view.asset_3d_id_uuid'),
            'asset_3d_id.exists' => __('messages.shared_view.asset_3d_id_exists'),
            'share_token.required' => __('messages.shared_view.token_required'),
            'share_token.unique' => __('messages.shared_view.token_unique'),
            'camera_position.required' => __('messages.shared_view.camera_pos_required'),
            'camera_position.array' => __('messages.shared_view.camera_pos_array'),
            'camera_target.required' => __('messages.shared_view.camera_target_required'),
            'camera_target.array' => __('messages.shared_view.camera_target_array'),
            'teacher_note.string' => __('messages.shared_view.note_string'),
            'teacher_note.max' => __('messages.shared_view.note_max'),
        ];
    }
}
