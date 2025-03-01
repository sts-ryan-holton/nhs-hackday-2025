<?php

namespace Database\Seeders;

use App\Models\Call;
use Illuminate\Database\Seeder;

class CallSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Call::factory(10)->create([
            'score' => rand(1, 100),
        ]);
    }
}
