'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPendingPlants, approvePlant, bulkApprovePlants } from '@/actions/admin-actions';
import { PendingPlant } from '@/types';
import { Check, X, Leaf } from 'lucide-react';

export default function AdminApprovalPage() {
  const [plants, setPlants] = useState<PendingPlant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlants();
  }, []);

  async function loadPlants() {
    setIsLoading(true);
    const result = await getPendingPlants();
    if (result.success && result.data) {
      setPlants(result.data);
    }
    setIsLoading(false);
  }

  async function handleApprove(plantId: string, status: 'APPROVED' | 'REJECTED') {
    setProcessingId(plantId);
    const result = await approvePlant({ plantId, status });
    
    if (result.success) {
      setPlants(plants.filter((p) => p.id !== plantId));
    }
    setProcessingId(null);
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    
    setIsLoading(true);
    const result = await bulkApprovePlants(Array.from(selectedIds));
    
    if (result.success) {
      setPlants(plants.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    }
    setIsLoading(false);
  }

  function toggleSelect(plantId: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.add(plantId);
    }
    setSelectedIds(newSelected);
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -100, transition: { duration: 0.3 } },
  };

  if (isLoading && plants.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Leaf className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plant Approval Queue</h1>
            <p className="mt-2 text-gray-600">
              {plants.length} {plants.length === 1 ? 'plant' : 'plants'} pending review
            </p>
          </div>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button onClick={handleBulkApprove} size="lg">
                Approve {selectedIds.size} Selected
              </Button>
            </motion.div>
          )}
        </div>

        {plants.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Leaf className="mx-auto h-16 w-16 text-gray-400" />
            <h2 className="mt-4 text-2xl font-semibold text-gray-700">All caught up!</h2>
            <p className="mt-2 text-gray-600">No plants pending approval at the moment.</p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {plants.map((plant) => (
                <motion.div key={plant.id} variants={item} layout exit="exit">
                  <Card className="overflow-hidden">
                    <div className="relative">
                      {plant.imageUrl && (
                        <img
                          src={plant.imageUrl}
                          alt={plant.species}
                          className="h-48 w-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(plant.id)}
                          onChange={() => toggleSelect(plant.id)}
                          className="h-5 w-5 rounded border-gray-300"
                        />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{plant.species}</span>
                        <Badge variant="secondary">{plant.healthScore}%</Badge>
                      </CardTitle>
                      {plant.commonName && (
                        <p className="text-sm text-gray-600">{plant.commonName}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-gray-700 line-clamp-3">
                        {plant.description}
                      </p>
                      
                      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                        {plant.difficulty && (
                          <div>
                            <span className="font-semibold">Difficulty:</span> {plant.difficulty}
                          </div>
                        )}
                        {plant.sunlight && (
                          <div>
                            <span className="font-semibold">Sunlight:</span> {plant.sunlight}
                          </div>
                        )}
                        {plant.waterNeeds && (
                          <div>
                            <span className="font-semibold">Water:</span> {plant.waterNeeds}
                          </div>
                        )}
                      </div>

                      <div className="mb-4 rounded-md bg-gray-50 p-3">
                        <p className="text-xs text-gray-600">
                          Submitted by: <span className="font-semibold">{plant.donor.name}</span>
                        </p>
                        <p className="text-xs text-gray-600">{plant.donor.email}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(plant.id, 'APPROVED')}
                          disabled={processingId === plant.id}
                          className="flex-1"
                          size="sm"
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleApprove(plant.id, 'REJECTED')}
                          disabled={processingId === plant.id}
                          variant="destructive"
                          className="flex-1"
                          size="sm"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
