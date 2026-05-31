<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'huggingface' => [
        'api_base' => env('HF_API_BASE', 'https://router.huggingface.co/v1'),
        /** Durée (secondes) de mémorisation du dernier token HF ayant réussi */
        'token_cache_ttl' => (int) env('HF_TOKEN_CACHE_TTL', 300),
        'tokens' => array_values(array_filter(array_unique(array_map(
            fn ($key) => env($key),
            ['HF_TOKEN', 'HF_TOKEN_1', 'HF_TOKEN_2', 'HF_TOKEN_3', 'HF_TOKEN_4']
        )))),
        /** Modèles activés sur le router HF (402 = crédits épuisés, pas modèle inconnu) */
        'cloud_models' => [
            'deepseek-ai/DeepSeek-V4-Flash',
            'meta-llama/Llama-3.1-8B-Instruct',
            'meta-llama/Meta-Llama-3-8B-Instruct',
            'Qwen/Qwen2.5-7B-Instruct',
        ],
    ],

    'ollama' => [
        'binary' => env('OLLAMA_BIN', '/usr/local/bin/ollama'),
        'home' => env('OLLAMA_HOME', '/home/bellox'),
        'fallback_models' => ['phi3:latest', 'tinyllama:latest', 'llama3:latest'],
        'timeout_explain' => (int) env('OLLAMA_TIMEOUT_EXPLAIN', 90),
        'timeout_quiz' => (int) env('OLLAMA_TIMEOUT_QUIZ', 60),
        'max_prompt_chars' => (int) env('OLLAMA_MAX_PROMPT_CHARS', 2800),
    ],

];
