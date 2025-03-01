<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Casts\Json;

class Call extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'status',
        'ai_response',
        'sent_to_doctor',
        'call_finished_at'
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ai_response' => Json::class,
            'sent_to_doctor' => 'boolean',
            'call_finished_at' => 'datetime'
        ];
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'has_finished',
        'is_expanded'
    ];

    /**
     * Get call finished
     */
    public function getHasFinishedAttribute(): bool
    {
        if ($this->call_finished_at) {
            return true;
        }

        return false;
    }

    /**
     * Get call expanded
     */
    public function getIsExpandedAttribute(): bool
    {
        return false;
    }

    public function doctor(): HasOne
    {
        return $this->hasOne(UserCall::class);
    }
}
