<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'role' => 'reception',
            'name' => 'Sarah',
            'email' => 'sarah@gp.com',
        ]);

        User::factory()->create([
            'role' => 'doctor',
            'name' => 'John',
            'email' => 'john@gp.com',
        ]);

        User::factory()->create([
            'role' => 'doctor',
            'name' => 'Jane',
            'email' => 'jane@gp.com',
        ]);
    }
}
