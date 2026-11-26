<?php

namespace App\Support;

/**
 * Mensajes en español de la regla de contraseñas del proyecto (Password::defaults(), definida en AppServiceProvider):
 * mínimo 8 caracteres, mayúscula y minúscula, un número y un símbolo.
 * Cada Form Request con un campo de contraseña los agrega en su messages().
 */
class PasswordPolicy
{
    /**
     * @return array<string, string>
     */
    public static function messages(string $field = 'password'): array
    {
        return [
            "$field.required" => 'Escribe una contraseña.',
            "$field.min" => 'La contraseña debe tener al menos 8 caracteres.',
            "$field.password.mixed" => 'La contraseña debe tener al menos una letra mayúscula y una minúscula.',
            "$field.password.numbers" => 'La contraseña debe tener al menos un número.',
            "$field.password.symbols" => 'La contraseña debe tener al menos un símbolo (por ejemplo ! @ # $).',
            "$field.confirmed" => 'La confirmación de la contraseña no coincide.',
        ];
    }
}
