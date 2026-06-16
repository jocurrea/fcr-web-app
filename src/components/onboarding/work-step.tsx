import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkStepProps {
  onNext: () => void;
}

export function WorkStep({ onNext }: WorkStepProps) {
  const [medicalClass, setMedicalClass] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.medicalClass) return parsed.medicalClass;
      }
    }
    return "1st";
  });
  const [commandType, setCommandType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.commandType) return parsed.commandType;
      }
    }
    return "pic";
  });
  const [crossedOcean, setCrossedOcean] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.crossedOcean) return parsed.crossedOcean;
      }
    }
    return "yes";
  });
  const [adminExp, setAdminExp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adminExp) return parsed.adminExp;
      }
    }
    return "yes";
  });
  const [adminRole, setAdminRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adminRole) return parsed.adminRole;
      }
    }
    return "administration";
  });

  const [flightHours, setFlightHours] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.flightHours) return parsed.flightHours;
      }
    }
    return "";
  });
  const [employer, setEmployer] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.employer) return parsed.employer;
      }
    }
    return "";
  });
  const [employmentStatus, setEmploymentStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.employmentStatus) return parsed.employmentStatus;
      }
    }
    return "";
  });
  const [workCountry, setWorkCountry] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workCountry) return parsed.workCountry;
      }
    }
    return "";
  });
  const [adminDescription, setAdminDescription] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adminDescription) return parsed.adminDescription;
      }
    }
    return "";
  });

  useEffect(() => {
    localStorage.setItem("onboarding_work", JSON.stringify({
      medicalClass, commandType, crossedOcean, adminExp, adminRole, flightHours, employer, employmentStatus, workCountry, adminDescription
    }));
  }, [medicalClass, commandType, crossedOcean, adminExp, adminRole, flightHours, employer, employmentStatus, workCountry, adminDescription]);

  return (
    <div className="flex-1 flex flex-col mt-4">
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-6">
        
        <div className="space-y-3">
          <Label className="text-gray-700">Medical Certificate Class</Label>
          <div className="flex gap-4">
            {["1st", "2nd", "3rd"].map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setMedicalClass(cls)}
                className={`flex-1 py-3 rounded-full font-semibold transition-colors ${
                  medicalClass === cls
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Total flight hours</Label>
          <Input 
            className="rounded-2xl py-6" 
            value={flightHours}
            onChange={(e) => setFlightHours(e.target.value)}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Employer</Label>
          <Input className="rounded-2xl py-6" value={employer} onChange={(e) => setEmployer(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Employement Status</Label>
          <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
            <SelectTrigger className="w-full rounded-2xl py-6">
              <SelectValue placeholder="Select an Item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flying_high_current">Flying high and enjoying my current skies</SelectItem>
              <SelectItem value="flying_high_new">Flying high and open to new horizons</SelectItem>
              <SelectItem value="looking_new">Looking for new skies with new wings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Work Country</Label>
          <Select value={workCountry} onValueChange={setWorkCountry}>
            <SelectTrigger className="w-full rounded-2xl py-6">
              <SelectValue placeholder="US United States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">AR Argentina</SelectItem>
              <SelectItem value="au">AU Australia</SelectItem>
              <SelectItem value="at">AT Austria</SelectItem>
              <SelectItem value="bh">BH Bahrain</SelectItem>
              <SelectItem value="bd">BD Bangladesh</SelectItem>
              <SelectItem value="be">BE Belgium</SelectItem>
              <SelectItem value="br">BR Brazil</SelectItem>
              <SelectItem value="ca">CA Canada</SelectItem>
              <SelectItem value="cl">CL Chile</SelectItem>
              <SelectItem value="cn">CN China</SelectItem>
              <SelectItem value="co">CO Colombia</SelectItem>
              <SelectItem value="cz">CZ Czech Republic</SelectItem>
              <SelectItem value="dk">DK Denmark</SelectItem>
              <SelectItem value="eg">EG Egypt</SelectItem>
              <SelectItem value="fi">FI Finland</SelectItem>
              <SelectItem value="fr">FR France</SelectItem>
              <SelectItem value="de">DE Germany</SelectItem>
              <SelectItem value="gr">GR Greece</SelectItem>
              <SelectItem value="hu">HU Hungary</SelectItem>
              <SelectItem value="in">IN India</SelectItem>
              <SelectItem value="id">ID Indonesia</SelectItem>
              <SelectItem value="ie">IE Ireland</SelectItem>
              <SelectItem value="il">IL Israel</SelectItem>
              <SelectItem value="it">IT Italy</SelectItem>
              <SelectItem value="jp">JP Japan</SelectItem>
              <SelectItem value="ke">KE Kenya</SelectItem>
              <SelectItem value="kw">KW Kuwait</SelectItem>
              <SelectItem value="my">MY Malaysia</SelectItem>
              <SelectItem value="mx">MX Mexico</SelectItem>
              <SelectItem value="np">NP Nepal</SelectItem>
              <SelectItem value="nl">NL Netherlands</SelectItem>
              <SelectItem value="nz">NZ New Zealand</SelectItem>
              <SelectItem value="ng">NG Nigeria</SelectItem>
              <SelectItem value="no">NO Norway</SelectItem>
              <SelectItem value="om">OM Oman</SelectItem>
              <SelectItem value="pk">PK Pakistan</SelectItem>
              <SelectItem value="pe">PE Peru</SelectItem>
              <SelectItem value="ph">PH Philippines</SelectItem>
              <SelectItem value="pl">PL Poland</SelectItem>
              <SelectItem value="pt">PT Portugal</SelectItem>
              <SelectItem value="qa">QA Qatar</SelectItem>
              <SelectItem value="ro">RO Romania</SelectItem>
              <SelectItem value="ru">RU Russia</SelectItem>
              <SelectItem value="sa">SA Saudi Arabia</SelectItem>
              <SelectItem value="sg">SG Singapore</SelectItem>
              <SelectItem value="za">ZA South Africa</SelectItem>
              <SelectItem value="kr">KR South Korea</SelectItem>
              <SelectItem value="es">ES Spain</SelectItem>
              <SelectItem value="lk">LK Sri Lanka</SelectItem>
              <SelectItem value="se">SE Sweden</SelectItem>
              <SelectItem value="ch">CH Switzerland</SelectItem>
              <SelectItem value="th">TH Thailand</SelectItem>
              <SelectItem value="tr">TR Turkey</SelectItem>
              <SelectItem value="ae">AE United Arab Emirates</SelectItem>
              <SelectItem value="gb">GB United Kingdom</SelectItem>
              <SelectItem value="us">US United States</SelectItem>
              <SelectItem value="ve">VE Venezuela</SelectItem>
              <SelectItem value="vn">VN Vietnam</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => setCommandType("pic")}
            className={`flex-1 py-3 rounded-full font-semibold transition-colors text-sm ${
              commandType === "pic"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            Pilot in Command
          </button>
          <button
            type="button"
            onClick={() => setCommandType("sic")}
            className={`flex-1 py-3 rounded-full font-semibold transition-colors text-sm ${
              commandType === "sic"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            Second in Command
          </button>
        </div>

        <div className="space-y-3 mt-6">
          <Label className="text-gray-700">Have you crossed any ocean (Atlantic or Pacific)?</Label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCrossedOcean("yes")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors ${
                crossedOcean === "yes"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setCrossedOcean("no")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors ${
                crossedOcean === "no"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              No
            </button>
          </div>
        </div>

        <div className="space-y-3 mt-6">
          <Label className="text-gray-700 leading-tight block">During your aviation career, have you acquired any experience in administration?</Label>
          <div className="flex gap-4 mt-3">
            <button
              type="button"
              onClick={() => setAdminExp("yes")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors ${
                adminExp === "yes"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setAdminExp("no")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors ${
                adminExp === "no"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {adminExp === "yes" && (
          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-gray-700 text-base font-normal leading-tight block">What kind of administrative roles have you held in your professional experience?</Label>
              <div className="space-y-4 pt-2">
                {[
                  { id: "administration", label: "Administration" },
                  { id: "operations", label: "Operations" },
                  { id: "purchasing", label: "Aircraft purchasing and sales" },
                  { id: "maintenance", label: "Maintenance" }
                ].map((role) => (
                  <div key={role.id} onClick={() => setAdminRole(role.id)} className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${adminRole === role.id ? 'border-blue-600' : 'border-gray-400'}`}>
                      {adminRole === role.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                    </div>
                    <span className="text-gray-700 text-base">{role.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Admin Role Description</Label>
              <Textarea value={adminDescription} onChange={(e) => setAdminDescription(e.target.value)} placeholder="description..." className="rounded-2xl p-4 min-h-[120px]" />
            </div>
          </div>
        )}

      </div>

      <div className="p-4 bg-white mt-auto mb-4">
        <Button 
          onClick={onNext}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
