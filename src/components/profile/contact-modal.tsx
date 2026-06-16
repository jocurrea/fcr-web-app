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

export function ContactModal() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // QA Fix: Phone acepta solo números y el símbolo +
    const value = e.target.value.replace(/[^0-9+]/g, "");
    setPhone(value);
  };

  const validateEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // QA Fix: Validación estricta formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Contact Info
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+1234567890"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="email" className="text-right mt-3">
              Email
            </Label>
            <div className="col-span-3">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={validateEmail}
                placeholder="email@example.com"
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="country" className="text-right">
              Work Country
            </Label>
            <div className="col-span-3">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="mx">Mexico</SelectItem>
                  <SelectItem value="co">Colombia</SelectItem>
                  {/* QA Fix: Incluir Venezuela en la lista */}
                  <SelectItem value="ve">Venezuela</SelectItem>
                  <SelectItem value="es">Spain</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
