<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class UserCall extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'call_id',
    ];

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function call(): HasOne
    {
        return $this->hasOne(Call::class);
    }
}
