<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // On récupère la langue depuis le header 'Accept-Language' envoyé par le frontend
        $locale = $request->header('Accept-Language', config('app.locale'));

        // On vérifie si la langue est supportée (fr ou en)
        if (in_array($locale, ['fr', 'en'])) {
            App::setLocale($locale);
        } else {
            App::setLocale(config('app.locale'));
        }

        return $next($request);
    }
}
