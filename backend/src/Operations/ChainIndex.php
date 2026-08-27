<?php

declare(strict_types=1);

namespace App\Operations;

interface ChainIndex
{
    public function snapshot(): ChainSnapshot;
}
