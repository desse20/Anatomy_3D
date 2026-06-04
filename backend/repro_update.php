<?php
use App\Models\Asset3d;
use Illuminate\Support\Facades\Storage;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$asset = Asset3d::first();
if (!$asset) {
    echo "No asset found\n";
    exit;
}

echo "Original URL: " . $asset->url_glb . "\n";
echo "Original Name: " . $asset->name . "\n";

$newName = "Test Name " . time();
$asset->name = $newName;

$oldPath = $asset->url_glb;
$extension = pathinfo($oldPath, PATHINFO_EXTENSION);
$slug = \Illuminate\Support\Str::slug($newName, '_');
$newFilename = $slug . '.' . $extension;
$newPath = 'Assets_3D/' . $newFilename;

echo "New Target Path: " . $newPath . "\n";

if ($newPath !== $oldPath) {
    if (Storage::disk('local')->exists($oldPath)) {
        if (Storage::disk('local')->move($oldPath, $newPath)) {
            echo "Moved file on disk\n";
            $asset->url_glb = $newPath;
        } else {
            echo "Failed to move file\n";
        }
    } else {
        echo "Old file not found on disk: $oldPath\n";
    }
}

$asset->save();

$refreshed = $asset->fresh();
echo "Refreshed URL in DB: " . $refreshed->url_glb . "\n";
echo "Refreshed Name: " . $refreshed->name . "\n";
