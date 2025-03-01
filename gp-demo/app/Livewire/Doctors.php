<?php

namespace App\Livewire;

use Livewire\Component;
use App\Models\User;
use App\Models\Call;
use App\Models\UserCall;

class Doctors extends Component
{
    public function deleteAllCalls(int $id)
    {
        $userCalls = UserCall::where('user_id', $id)->get();

        if (count($userCalls) <= 0) {
            return;
        }

        foreach ($userCalls as $call) {
            $call->delete();

            Call::destroy($call->call_id);
        }
    }

    public function render()
    {
        return view('livewire.doctors', [
            'doctors' => User::where('role', 'doctor')->withCount('calls')->get()
        ]);
    }
}
