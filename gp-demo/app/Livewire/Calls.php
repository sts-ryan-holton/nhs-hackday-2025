<?php

namespace App\Livewire;

use Livewire\Component;
use App\Models\Call;
use App\Models\User;
use App\Models\UserCall;

class Calls extends Component
{
    public function sendToDoctor(int $id)
    {
        $doctor = User::where('role', 'doctor')->inRandomOrder()->first();

        UserCall::create([
            'user_id' => $doctor->id,
            'call_id' => $id
        ]);

        Call::find($id)->update(['sent_to_doctor' => true]);
    }

    public function markAsResolved(int $id)
    {
        Call::destroy($id);
    }

    public function render()
    {
        return view('livewire.calls', [
            'calls' => Call::orderByDesc('created_at')->where('sent_to_doctor', false)->get()
        ]);
    }
}
