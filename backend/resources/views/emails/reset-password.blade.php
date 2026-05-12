<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f3f5f9;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .header {
            background-color: #0c79f2;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 1px;
        }
        .content {
            padding: 40px;
            color: #2f3742;
            line-height: 1.6;
        }
        .content h2 {
            font-size: 22px;
            margin-bottom: 20px;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .button {
            background-color: #0c79f2;
            color: #ffffff !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            display: inline-block;
            transition: background-color 0.3s;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            font-size: 13px;
            color: #5e6773;
            border-top: 1px solid #edf2f7;
        }
        .logo-text {
            color: #ffffff;
            font-weight: 800;
        }
        .logo-text span {
            color: #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-text">ANATOMY<span>3D</span></div>
            <h1>Récupération d'accès</h1>
        </div>
        <div class="content">
            <h2>Bonjour {{ $userName }},</h2>
            <p>Vous avez demandé la réinitialisation du mot de passe de votre compte <strong>Anatomy 3D</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valable pendant 60 minutes.</p>
            
            <div class="button-container">
                <a href="{{ $resetUrl }}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
            <p>À très bientôt sur la plateforme,</p>
            <p><strong>L'équipe Anatomy 3D</strong></p>
        </div>
        <div class="footer">
            © 2026 Anatomy 3D Explorer. L'anatomie à portée de main au Bénin.
        </div>
    </div>
</body>
</html>
