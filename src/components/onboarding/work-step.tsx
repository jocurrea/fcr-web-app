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

const COUNTRIES: Record<string, string> = {
  ar: "Argentina", au: "Australia", at: "Austria", bh: "Bahrain", bd: "Bangladesh",
  be: "Belgium", br: "Brazil", ca: "Canada", cl: "Chile", cn: "China", co: "Colombia",
  cz: "Czech Republic", dk: "Denmark", eg: "Egypt", fi: "Finland", fr: "France",
  de: "Germany", gr: "Greece", hu: "Hungary", in: "India", id: "Indonesia", ie: "Ireland",
  il: "Israel", it: "Italy", jp: "Japan", ke: "Kenya", kw: "Kuwait", my: "Malaysia",
  mx: "Mexico", np: "Nepal", nl: "Netherlands", nz: "New Zealand", ng: "Nigeria",
  no: "Norway", om: "Oman", pk: "Pakistan", pe: "Peru", ph: "Philippines", pl: "Poland",
  pt: "Portugal", qa: "Qatar", ro: "Romania", ru: "Russia", sa: "Saudi Arabia",
  sg: "Singapore", za: "South Africa", kr: "South Korea", es: "Spain", lk: "Sri Lanka",
  se: "Sweden", ch: "Switzerland", th: "Thailand", tr: "Turkey", ae: "United Arab Emirates",
  gb: "United Kingdom", us: "United States", ve: "Venezuela", vn: "Vietnam"
};

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

  const EMPLOYMENT_STATUS_MAP: Record<string, string> = {
    "flying_high_current": "Flying high and enjoying my current skies",
    "flying_high_new": "Flying high and open to new horizons",
    "looking_new": "Looking for new skies with new wings",
  };

  const [employmentStatus, setEmploymentStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_work");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.employmentStatus) {
          return EMPLOYMENT_STATUS_MAP[parsed.employmentStatus] || parsed.employmentStatus;
        }
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
      medicalClass, commandType, crossedOcean, adminExp, adminRole, employmentStatus, workCountry, adminDescription
    }));
  }, [medicalClass, commandType, crossedOcean, adminExp, adminRole, employmentStatus, workCountry, adminDescription]);

  return (
    <div className="flex-1 flex flex-col mt-4 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-6 min-h-0">
        
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
          <Label className="text-gray-700">Employement Status</Label>
          <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
            <SelectTrigger className="w-full rounded-2xl py-6">
              <SelectValue placeholder="Select an Item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Flying high and enjoying my current skies">Flying high and enjoying my current skies</SelectItem>
              <SelectItem value="Flying high and open to new horizons">Flying high and open to new horizons</SelectItem>
              <SelectItem value="Looking for new skies with new wings">Looking for new skies with new wings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Work Country</Label>
          <Select value={workCountry} onValueChange={setWorkCountry}>
            <SelectTrigger className="w-full rounded-2xl py-6">
              {workCountry && COUNTRIES[workCountry] ? (
                <div className="flex items-center gap-2">
                  <img src={`https://flagcdn.com/w20/${workCountry}.png`} srcSet={`https://flagcdn.com/w40/${workCountry}.png 2x`} width="20" alt="" className="shadow-sm" />
                  <span>{COUNTRIES[workCountry]}</span>
                </div>
              ) : (
                <SelectValue placeholder="Select a Country" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ar.png" srcSet="https://flagcdn.com/w40/ar.png 2x" width="20" alt="" className="shadow-sm" /> <span>Argentina</span></div></SelectItem>
              <SelectItem value="au"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/au.png" srcSet="https://flagcdn.com/w40/au.png 2x" width="20" alt="" className="shadow-sm" /> <span>Australia</span></div></SelectItem>
              <SelectItem value="at"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/at.png" srcSet="https://flagcdn.com/w40/at.png 2x" width="20" alt="" className="shadow-sm" /> <span>Austria</span></div></SelectItem>
              <SelectItem value="bh"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/bh.png" srcSet="https://flagcdn.com/w40/bh.png 2x" width="20" alt="" className="shadow-sm" /> <span>Bahrain</span></div></SelectItem>
              <SelectItem value="bd"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/bd.png" srcSet="https://flagcdn.com/w40/bd.png 2x" width="20" alt="" className="shadow-sm" /> <span>Bangladesh</span></div></SelectItem>
              <SelectItem value="be"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/be.png" srcSet="https://flagcdn.com/w40/be.png 2x" width="20" alt="" className="shadow-sm" /> <span>Belgium</span></div></SelectItem>
              <SelectItem value="br"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/br.png" srcSet="https://flagcdn.com/w40/br.png 2x" width="20" alt="" className="shadow-sm" /> <span>Brazil</span></div></SelectItem>
              <SelectItem value="ca"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ca.png" srcSet="https://flagcdn.com/w40/ca.png 2x" width="20" alt="" className="shadow-sm" /> <span>Canada</span></div></SelectItem>
              <SelectItem value="cl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cl.png" srcSet="https://flagcdn.com/w40/cl.png 2x" width="20" alt="" className="shadow-sm" /> <span>Chile</span></div></SelectItem>
              <SelectItem value="cn"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cn.png" srcSet="https://flagcdn.com/w40/cn.png 2x" width="20" alt="" className="shadow-sm" /> <span>China</span></div></SelectItem>
              <SelectItem value="co"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/co.png" srcSet="https://flagcdn.com/w40/co.png 2x" width="20" alt="" className="shadow-sm" /> <span>Colombia</span></div></SelectItem>
              <SelectItem value="cz"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cz.png" srcSet="https://flagcdn.com/w40/cz.png 2x" width="20" alt="" className="shadow-sm" /> <span>Czech Republic</span></div></SelectItem>
              <SelectItem value="dk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/dk.png" srcSet="https://flagcdn.com/w40/dk.png 2x" width="20" alt="" className="shadow-sm" /> <span>Denmark</span></div></SelectItem>
              <SelectItem value="eg"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/eg.png" srcSet="https://flagcdn.com/w40/eg.png 2x" width="20" alt="" className="shadow-sm" /> <span>Egypt</span></div></SelectItem>
              <SelectItem value="fi"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/fi.png" srcSet="https://flagcdn.com/w40/fi.png 2x" width="20" alt="" className="shadow-sm" /> <span>Finland</span></div></SelectItem>
              <SelectItem value="fr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/fr.png" srcSet="https://flagcdn.com/w40/fr.png 2x" width="20" alt="" className="shadow-sm" /> <span>France</span></div></SelectItem>
              <SelectItem value="de"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/de.png" srcSet="https://flagcdn.com/w40/de.png 2x" width="20" alt="" className="shadow-sm" /> <span>Germany</span></div></SelectItem>
              <SelectItem value="gr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/gr.png" srcSet="https://flagcdn.com/w40/gr.png 2x" width="20" alt="" className="shadow-sm" /> <span>Greece</span></div></SelectItem>
              <SelectItem value="hu"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/hu.png" srcSet="https://flagcdn.com/w40/hu.png 2x" width="20" alt="" className="shadow-sm" /> <span>Hungary</span></div></SelectItem>
              <SelectItem value="in"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/in.png" srcSet="https://flagcdn.com/w40/in.png 2x" width="20" alt="" className="shadow-sm" /> <span>India</span></div></SelectItem>
              <SelectItem value="id"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/id.png" srcSet="https://flagcdn.com/w40/id.png 2x" width="20" alt="" className="shadow-sm" /> <span>Indonesia</span></div></SelectItem>
              <SelectItem value="ie"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ie.png" srcSet="https://flagcdn.com/w40/ie.png 2x" width="20" alt="" className="shadow-sm" /> <span>Ireland</span></div></SelectItem>
              <SelectItem value="il"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/il.png" srcSet="https://flagcdn.com/w40/il.png 2x" width="20" alt="" className="shadow-sm" /> <span>Israel</span></div></SelectItem>
              <SelectItem value="it"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/it.png" srcSet="https://flagcdn.com/w40/it.png 2x" width="20" alt="" className="shadow-sm" /> <span>Italy</span></div></SelectItem>
              <SelectItem value="jp"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/jp.png" srcSet="https://flagcdn.com/w40/jp.png 2x" width="20" alt="" className="shadow-sm" /> <span>Japan</span></div></SelectItem>
              <SelectItem value="ke"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ke.png" srcSet="https://flagcdn.com/w40/ke.png 2x" width="20" alt="" className="shadow-sm" /> <span>Kenya</span></div></SelectItem>
              <SelectItem value="kw"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/kw.png" srcSet="https://flagcdn.com/w40/kw.png 2x" width="20" alt="" className="shadow-sm" /> <span>Kuwait</span></div></SelectItem>
              <SelectItem value="my"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/my.png" srcSet="https://flagcdn.com/w40/my.png 2x" width="20" alt="" className="shadow-sm" /> <span>Malaysia</span></div></SelectItem>
              <SelectItem value="mx"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/mx.png" srcSet="https://flagcdn.com/w40/mx.png 2x" width="20" alt="" className="shadow-sm" /> <span>Mexico</span></div></SelectItem>
              <SelectItem value="np"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/np.png" srcSet="https://flagcdn.com/w40/np.png 2x" width="20" alt="" className="shadow-sm" /> <span>Nepal</span></div></SelectItem>
              <SelectItem value="nl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/nl.png" srcSet="https://flagcdn.com/w40/nl.png 2x" width="20" alt="" className="shadow-sm" /> <span>Netherlands</span></div></SelectItem>
              <SelectItem value="nz"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/nz.png" srcSet="https://flagcdn.com/w40/nz.png 2x" width="20" alt="" className="shadow-sm" /> <span>New Zealand</span></div></SelectItem>
              <SelectItem value="ng"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ng.png" srcSet="https://flagcdn.com/w40/ng.png 2x" width="20" alt="" className="shadow-sm" /> <span>Nigeria</span></div></SelectItem>
              <SelectItem value="no"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/no.png" srcSet="https://flagcdn.com/w40/no.png 2x" width="20" alt="" className="shadow-sm" /> <span>Norway</span></div></SelectItem>
              <SelectItem value="om"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/om.png" srcSet="https://flagcdn.com/w40/om.png 2x" width="20" alt="" className="shadow-sm" /> <span>Oman</span></div></SelectItem>
              <SelectItem value="pk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pk.png" srcSet="https://flagcdn.com/w40/pk.png 2x" width="20" alt="" className="shadow-sm" /> <span>Pakistan</span></div></SelectItem>
              <SelectItem value="pe"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pe.png" srcSet="https://flagcdn.com/w40/pe.png 2x" width="20" alt="" className="shadow-sm" /> <span>Peru</span></div></SelectItem>
              <SelectItem value="ph"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ph.png" srcSet="https://flagcdn.com/w40/ph.png 2x" width="20" alt="" className="shadow-sm" /> <span>Philippines</span></div></SelectItem>
              <SelectItem value="pl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pl.png" srcSet="https://flagcdn.com/w40/pl.png 2x" width="20" alt="" className="shadow-sm" /> <span>Poland</span></div></SelectItem>
              <SelectItem value="pt"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pt.png" srcSet="https://flagcdn.com/w40/pt.png 2x" width="20" alt="" className="shadow-sm" /> <span>Portugal</span></div></SelectItem>
              <SelectItem value="qa"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/qa.png" srcSet="https://flagcdn.com/w40/qa.png 2x" width="20" alt="" className="shadow-sm" /> <span>Qatar</span></div></SelectItem>
              <SelectItem value="ro"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ro.png" srcSet="https://flagcdn.com/w40/ro.png 2x" width="20" alt="" className="shadow-sm" /> <span>Romania</span></div></SelectItem>
              <SelectItem value="ru"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ru.png" srcSet="https://flagcdn.com/w40/ru.png 2x" width="20" alt="" className="shadow-sm" /> <span>Russia</span></div></SelectItem>
              <SelectItem value="sa"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/sa.png" srcSet="https://flagcdn.com/w40/sa.png 2x" width="20" alt="" className="shadow-sm" /> <span>Saudi Arabia</span></div></SelectItem>
              <SelectItem value="sg"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/sg.png" srcSet="https://flagcdn.com/w40/sg.png 2x" width="20" alt="" className="shadow-sm" /> <span>Singapore</span></div></SelectItem>
              <SelectItem value="za"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/za.png" srcSet="https://flagcdn.com/w40/za.png 2x" width="20" alt="" className="shadow-sm" /> <span>South Africa</span></div></SelectItem>
              <SelectItem value="kr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/kr.png" srcSet="https://flagcdn.com/w40/kr.png 2x" width="20" alt="" className="shadow-sm" /> <span>South Korea</span></div></SelectItem>
              <SelectItem value="es"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/es.png" srcSet="https://flagcdn.com/w40/es.png 2x" width="20" alt="" className="shadow-sm" /> <span>Spain</span></div></SelectItem>
              <SelectItem value="lk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/lk.png" srcSet="https://flagcdn.com/w40/lk.png 2x" width="20" alt="" className="shadow-sm" /> <span>Sri Lanka</span></div></SelectItem>
              <SelectItem value="se"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/se.png" srcSet="https://flagcdn.com/w40/se.png 2x" width="20" alt="" className="shadow-sm" /> <span>Sweden</span></div></SelectItem>
              <SelectItem value="ch"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ch.png" srcSet="https://flagcdn.com/w40/ch.png 2x" width="20" alt="" className="shadow-sm" /> <span>Switzerland</span></div></SelectItem>
              <SelectItem value="th"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/th.png" srcSet="https://flagcdn.com/w40/th.png 2x" width="20" alt="" className="shadow-sm" /> <span>Thailand</span></div></SelectItem>
              <SelectItem value="tr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/tr.png" srcSet="https://flagcdn.com/w40/tr.png 2x" width="20" alt="" className="shadow-sm" /> <span>Turkey</span></div></SelectItem>
              <SelectItem value="ae"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ae.png" srcSet="https://flagcdn.com/w40/ae.png 2x" width="20" alt="" className="shadow-sm" /> <span>United Arab Emirates</span></div></SelectItem>
              <SelectItem value="gb"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/gb.png" srcSet="https://flagcdn.com/w40/gb.png 2x" width="20" alt="" className="shadow-sm" /> <span>United Kingdom</span></div></SelectItem>
              <SelectItem value="us"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/us.png" srcSet="https://flagcdn.com/w40/us.png 2x" width="20" alt="" className="shadow-sm" /> <span>United States</span></div></SelectItem>
              <SelectItem value="ve"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ve.png" srcSet="https://flagcdn.com/w40/ve.png 2x" width="20" alt="" className="shadow-sm" /> <span>Venezuela</span></div></SelectItem>
              <SelectItem value="vn"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/vn.png" srcSet="https://flagcdn.com/w40/vn.png 2x" width="20" alt="" className="shadow-sm" /> <span>Vietnam</span></div></SelectItem>
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
          Next / Skip
        </Button>
      </div>
    </div>
  );
}
