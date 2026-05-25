<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabSharedView extends Model
{
    use HasUuids;

    protected $table = 'lab_shared_views';

    public $timestamps = false;

    protected $fillable = [
        'lab_id',
        'shared_view_id',
    ];

    /**
     * Relation : Ce pivot appartient à un Lab.
     */
    public function lab(): BelongsTo
    {
        return $this->belongsTo(Lab::class, 'lab_id');
    }

    /**
     * Relation : Ce pivot appartient à une SharedView.
     */
    public function sharedView(): BelongsTo
    {
        return $this->belongsTo(SharedView::class, 'shared_view_id');
    }
}
