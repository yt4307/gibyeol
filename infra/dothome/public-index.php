<?php

use App\Kernel;

require_once __DIR__.'/_gibyeol/vendor/autoload_runtime.php';

return static function (array $context): Kernel {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
