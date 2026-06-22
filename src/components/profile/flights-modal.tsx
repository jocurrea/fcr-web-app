"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FlightsModal() {
  const [hours, setHours] = useState("");

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // QA Fix: Only positive integers allowed
    const value = e.target.value.replace(/[^0-9]/g, "");
    setHours(value);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Flight Hours
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Total flight hours</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hours" className="text-right">
              Hours
            </Label>
            <Input
              id="hours"
              value={hours}
              onChange={handleHoursChange}
              placeholder="e.g. 1500"
              className="col-span-3"
              inputMode="numeric"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button type="button" variant="secondary" />}>
            Close
          </DialogClose>
          <Button type="button">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
