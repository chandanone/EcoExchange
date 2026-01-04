'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createPlant } from '@/actions/plant-actions';

export default function NewPlantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const result = await createPlant({
      species: formData.get('species') as string,
      commonName: formData.get('commonName') as string || undefined,
      description: formData.get('description') as string,
      healthScore: parseInt(formData.get('healthScore') as string),
      imageUrl: formData.get('imageUrl') as string || undefined,
      difficulty: formData.get('difficulty') as string || undefined,
      sunlight: formData.get('sunlight') as string || undefined,
      waterNeeds: formData.get('waterNeeds') as string || undefined,
      category: formData.get('category') as string || undefined,
    });

    if (result.success) {
      router.push('/plants');
      router.refresh();
    } else {
      setError(result.error || 'Failed to create plant');
    }
    
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>List a New Plant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="species">Species Name *</Label>
              <Input
                id="species"
                name="species"
                placeholder="e.g., Monstera Deliciosa"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commonName">Common Name</Label>
              <Input
                id="commonName"
                name="commonName"
                placeholder="e.g., Swiss Cheese Plant"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe your plant cutting..."
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="healthScore">Health Score (0-100) *</Label>
              <Input
                id="healthScore"
                name="healthScore"
                type="number"
                min="0"
                max="100"
                defaultValue="100"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  name="difficulty"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={isLoading}
                >
                  <option value="">Select...</option>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sunlight">Sunlight</Label>
                <select
                  id="sunlight"
                  name="sunlight"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={isLoading}
                >
                  <option value="">Select...</option>
                  <option value="Full Sun">Full Sun</option>
                  <option value="Partial">Partial</option>
                  <option value="Shade">Shade</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waterNeeds">Water Needs</Label>
                <select
                  id="waterNeeds"
                  name="waterNeeds"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={isLoading}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g., Indoor, Outdoor, Succulent"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
