@props([
  'size' => null,
])

@php
  $sizeClass = match($size) {
    'xs' => 'w-10',
    'sm' => 'w-16',
    'md' => 'w-32',
    'lg' => 'w-96',
    default => '',
  };
@endphp

<td {{ $attributes->merge(['class' => "py-3.5 px-4 whitespace-nowrap $sizeClass"]) }}>
  {{ $slot }}
</td>
