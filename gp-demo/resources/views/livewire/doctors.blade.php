<div class="space-y-6" wire:poll.1s>
    @foreach ($doctors as $doctor)
        <article class="grid grid-cols-2 bg-white overflow-hidden shadow-sm sm:rounded-lg p-4">
            <div class="flex items-center">
                @if ($doctor->name == 'John')
                    <img src="{{ asset('/boy.png') }}" alt="User Avatar" class="w-12 h-12 rounded-full mr-4">
                @else
                    <img src="{{ asset('/girl.png') }}" alt="User Avatar" class="w-12 h-12 rounded-full mr-4">
                @endif

                <div class="flex flex-col">
                    <h3 class="text-lg font-semibold text-gray-800">{{ $doctor->name }}</h3>
                    <p class="text-sm text-gray-500">{{ $doctor->email }}, assigned calls: <b>{{ $doctor->calls_count }}</b></p>
                </div>
            </div>
            <div class="flex items-center justify-end">
                <button wire:click="deleteAllCalls({{ $doctor->id }})" type="button" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    Delete all calls
                </button>
            </div>
        </article>
    @endforeach
</div>
