"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LicenseModal() {
  const [license, setLicense] = useState("");

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // QA Fix: Solo permitir números enteros
    const value = e.target.value.replace(/[^0-9]/g, "");
    setLicense(value);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit License
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nro de licencia</DialogTitle>
          <DialogDescription>
            Enter your flight crew license number.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="license" className="text-right">
              License
            </Label>
            <Input
              id="license"
              value={license}
              onChange={handleLicenseChange}
              placeholder="e.g. 123456789"
              className="col-span-3"
              type="text"
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
