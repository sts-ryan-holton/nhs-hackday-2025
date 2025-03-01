@props([
  'size' => null,
  'sortable' => null,
  'direction' => null
])

<th {{ $attributes->merge(['class' => 'text-nowrap font-bold py-3 px-4'])->only('class') }}>
  @unless ($sortable)
    <span class="flex items-center space-x-1 text-left text-sm leading-4 font-medium">
      {{ $slot }}
    </span>
  @else
    <button {{ $attributes->except('class') }} class="flex items-center space-x-1 text-left text-sm leading-4 font-medium">
      <span>{{ $slot }}</span>

      <span>
        @if ($direction === 'asc')
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
          </svg>
        @elseif ($direction === 'desc')
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        @endif
      </span>
    </button>
  @endunless
</th>
