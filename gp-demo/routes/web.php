<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::view('/phone', 'phone');

Route::view('dashboard', 'dashboard')
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::view('room', 'room')
    ->middleware(['auth', 'verified'])
    ->name('room');

Route::view('doctors', 'doctors')
    ->middleware(['auth', 'verified'])
    ->name('doctors');

Route::view('profile', 'profile')
    ->middleware(['auth'])
    ->name('profile');

require __DIR__.'/auth.php';
