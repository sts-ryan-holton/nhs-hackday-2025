<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Call;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class CallController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $call = Call::create([
            'status' => 'initiated'
        ]);

        return response()->json($call);
    }

    /**
     * Display the specified resource.
     */
    public function show(Call $call)
    {

    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Call $call)
    {
        $callSummary = Arr::get($request->input('ai_response'), 'summary', null);

        $call->update([
            'status' => $request->input('status'),
            'ai_response' => [
                'summary' => $callSummary
            ],
            'call_finished_at' => $request->input('status') == 'completed' ? now() : null
        ]);

        return response()->json($call);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Call $call)
    {
        //
    }
}
