import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/utils/apiClient';

interface CreateSprintDialogProps {
  projectId: string;
  onSprintCreated: () => void;
}

export function CreateSprintDialog({ projectId, onSprintCreated }: CreateSprintDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [duration, setDuration] = useState('1'); // Default 1 week

  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    goal: '',
  });

  // Calculate end date based on start date and duration
  useEffect(() => {
    if (isAdvanced) return;

    if (formData.startDate && duration) {
      const start = new Date(formData.startDate);
      const end = new Date(start);
      
      if (duration === '4') {
        // 1 Month
        end.setMonth(end.getMonth() + 1);
      } else {
        // Weeks
        end.setDate(end.getDate() + (parseInt(duration) * 7));
      }
      
      setFormData(prev => ({
        ...prev,
        endDate: end.toISOString().split('T')[0]
      }));
    }
  }, [formData.startDate, duration, isAdvanced]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
  };

  const toggleAdvanced = () => {
    setIsAdvanced(!isAdvanced);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.name || !formData.startDate || !formData.endDate) {
        error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        error('End date must be after start date');
        setIsLoading(false);
        return;
      }

      await apiClient.post('/api/sprints', {
        projectId,
        name: formData.name,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        goal: formData.goal,
        status: 'planned',
      });

      success('Sprint created successfully');
      setOpen(false);
      setFormData({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        goal: '',
      });
      setDuration('1');
      setIsAdvanced(false);
      onSprintCreated();
    } catch (err) {
      console.error('Failed to create sprint:', err);
      error('Failed to create sprint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Sprint</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Sprint</DialogTitle>
          <DialogDescription>
            Create a new sprint for this project. Define the timeline and goal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Sprint 1"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            
            {!isAdvanced ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration
                </Label>
                <div className="col-span-3">
                  <Select value={duration} onValueChange={handleDurationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Week</SelectItem>
                      <SelectItem value="2">2 Weeks</SelectItem>
                      <SelectItem value="4">4 Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3">
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 h-auto text-xs text-muted-foreground"
                  onClick={toggleAdvanced}
                >
                  {isAdvanced ? 'standard durations' : 'Advanced'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal" className="text-right">
                Goal
              </Label>
              <Textarea
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                placeholder="What do we want to achieve?"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Sprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
