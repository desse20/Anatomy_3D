<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Géré par middleware simple_auth
    }

    public function rules(): array
    {
        return [
            'type'      => ['required', 'in:platform,model_3d,object'],
            'rating'    => ['required', 'integer', 'min:1', 'max:5'],
            'comment'   => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        $lang = $this->header('Accept-Language', 'fr');
        $isFr = str_starts_with($lang, 'fr');

        return [
            'type.required'   => $isFr ? 'Le type est requis.' : 'Type is required.',
            'type.in'         => $isFr ? 'Type invalide.' : 'Invalid type.',
            'rating.required' => $isFr ? 'La note est requise.' : 'Rating is required.',
            'rating.min'      => $isFr ? 'La note minimale est 1.' : 'Minimum rating is 1.',
            'rating.max'      => $isFr ? 'La note maximale est 5.' : 'Maximum rating is 5.',
            'comment.max'     => $isFr ? 'Le commentaire ne peut pas dépasser 2000 caractères.' : 'Comment cannot exceed 2000 characters.',
        ];
    }
}
