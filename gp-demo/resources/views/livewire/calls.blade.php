<div wire:poll.1s>
    <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-8">
        <div class="p-4">
            Calls: {{ $calls->count() }}
        </div>
    </div>

    <section class="space-y-4">
        @if (isset($calls) && $calls->count() > 0)
            @foreach ($calls as $index => $call)
                <article class="grid grid-cols-7 bg-white overflow-hidden shadow-sm sm:rounded-lg p-4 space-x-6">
                    <div>
                        <h4 class="text-slate-800 font-bold mb-1">Status</h4>

                        @if ($call->status == 'initiated')
                            <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">Call started</span>
                        @elseif ($call->status == 'greeting')
                            <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">Greeting</span>
                        @elseif ($call->status == 'listening')
                            <span class="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 font-medium text-pink-700 ring-1 ring-pink-700/10 ring-inset">Listening</span>
                        @elseif ($call->status == 'processing')
                            <span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-700 ring-1 ring-indigo-700/10 ring-inset">Processing</span>
                        @elseif ($call->status == 'responding')
                            <span class="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 font-medium text-pink-700 ring-1 ring-pink-700/10 ring-inset">Responding</span>
                        @elseif ($call->status == 'error')
                            <span class="inline-flex items-center rounded-md bg-red-50 px-2 py-1 font-medium text-red-700 ring-1 ring-red-700/10 ring-inset">Error</span>
                        @else
                            <span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 font-medium text-green-700 ring-1 ring-green-700/10 ring-inset">Call finished</span>
                        @endif
                    </div>
                    <div>
                        <h4 class="text-slate-800 font-bold mb-1">Duration</h4>

                        <span>{{ (int) $call->created_at->diffInSeconds($call->call_finished_at ? $call->call_finished_at : now(), false) }} seconds</span>
                    </div>
                    <div>
                        <h4 class="text-slate-800 font-bold mb-1">ID</h4>
                        <span>{{ $call->id }}</span>
                    </div>
                    <div>
                        <h4 class="text-slate-800 font-bold mb-1">Triage?</h4>

                        @if (isset($call->ai_response['summary']) && ! empty($call->ai_response['summary']))
                            <span>
                                {{ $call->ai_response['summary'] ?? '' }}
                            </span>
                        @else
                            <span>
                               Pending
                            </span>
                        @endif
                    </div>
                    <div>
                        <h4 class="text-slate-800 font-bold mb-1">Created</h4>
                        <span>{{ $call->created_at->toFormattedDateString() }}</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button wire:click="sendToDoctor({{ $call->id }})" type="button" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Doctor
                        </button>
                        <button wire:click="markAsResolved({{ $call->id }})" type="button" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Resolve
                        </button>
                    </div>
                </article>
            @endforeach
        @else
            <div class="flex items-center justify-center p-12">
                <div class="text-center">
                    <h3 class="text-2xl font-bold mb-4">No calls</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-12 mx-auto">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                </div>
            </div>
        @endif
    </section>
</div>
