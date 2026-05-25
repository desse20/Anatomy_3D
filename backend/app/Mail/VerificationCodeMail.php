<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $code;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct($code)
    {
        $this->code = $code;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('Code de vérification - Anatomy 3D')
                    ->html('
                        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                            <h2>Bienvenue sur Anatomy 3D !</h2>
                            <p>Voici votre code de vérification pour finaliser votre inscription :</p>
                            <div style="font-size: 30px; font-weight: bold; margin: 20px 0; color: #056CF2;">
                                ' . $this->code . '
                            </div>
                            <p>Ce code est valable 15 minutes.</p>
                        </div>
                    ');
    }
}
