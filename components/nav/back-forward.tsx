'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackForward() {
  const router = useRouter();
  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
        <ChevronLeft className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Go forward" onClick={() => router.forward()}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}