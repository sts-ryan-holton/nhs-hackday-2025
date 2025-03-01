<?php

namespace App\Livewire;

use Livewire\Component;

class VirtualPhone extends Component
{
    public function call()
    {
        dd('foo');
    }

    public function render()
    {
        return view('livewire.virtual-phone');
    }
}
