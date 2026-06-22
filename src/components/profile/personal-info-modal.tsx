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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PersonalInfoModal() {
  const [children, setChildren] = useState("");

  const handleChildrenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // QA Fix: Children only accepts integers
    const value = e.target.value.replace(/[^0-9]/g, "");
    setChildren(value);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Personal Info
      </DialogTrigger>
      {/* QA Fix: Expand width/height of modal so Selectors do not collapse */}
      <DialogContent className="sm:max-w-[500px] min-h-[380px] flex flex-col justify-between">
        <DialogHeader>
          <DialogTitle>Personal Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 flex-grow">
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Employment Status
            </Label>
            <div className="col-span-3">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Employment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="self-employed">Self-employed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="civil" className="text-right">
              Civil Status
            </Label>
            <div className="col-span-3">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Civil Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="children" className="text-right">
              Children
            </Label>
            <Input
              id="children"
              value={children}
              onChange={handleChildrenChange}
              placeholder="e.g. 2"
              className="col-span-3"
              inputMode="numeric"
            />
          </div>

        </div>
        <DialogFooter className="sm:justify-end mt-4">
          <DialogClose render={<Button type="button" variant="secondary" />}>
            Close
          </DialogClose>
          <Button type="button">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
