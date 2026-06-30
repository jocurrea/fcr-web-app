"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Globe } from "lucide-react";

export interface RatingData {
  id: string;
  ratingName: string;
}

interface AddRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRating: (rating: RatingData) => void;
}

export function AddRatingModal({ open, onOpenChange, onAddRating }: AddRatingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const ratingVal = formData.get("ratingVal") as string || "Unknown";

    let finalRating = ratingVal;
    if (ratingVal === "other") {
      const icaoCode = formData.get("icaoCode") as string || "";
      const model = formData.get("model") as string || "";
      finalRating = `${icaoCode} ${model}`.trim() || "OTHER";
    }

    setTimeout(() => {
      setIsLoading(false);
      onAddRating({
        id: Math.random().toString(36).substring(7),
        ratingName: finalRating.toUpperCase()
      });
      onOpenChange(false);
      setSelectedValue("");
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white">
        <DialogHeader className="px-4 py-4 border-b flex flex-row items-center justify-center relative">
          <DialogTitle className="text-xl font-bold text-center w-full">
            New rating
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="p-4 overflow-y-auto flex-1 space-y-6 mt-4">
            
            <div className="space-y-2">
              <Label>Choose Rating</Label>
              <Select name="ratingVal" value={selectedValue} onValueChange={(val) => setSelectedValue(val || "")}>
                <SelectTrigger className="w-full rounded-2xl py-6">
                  <SelectValue placeholder="Search models..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="a3st">A3ST AIRBUS A-300ST BELUGA</SelectItem>
                  <SelectItem value="a5">A5 ICON A-5</SelectItem>
                  <SelectItem value="a9">A9 AAMSA A9 QUAIL</SelectItem>
                  <SelectItem value="a19">A19 AEROPRACT A-19</SelectItem>
                  <SelectItem value="a21">A21 AEROPRACT A-21 Solo</SelectItem>
                  <SelectItem value="a23">A23 AEROPRACT A-23 Dragon</SelectItem>
                  <SelectItem value="a25">A25 AEROPRACT A-25 Breeze</SelectItem>
                  <SelectItem value="a27">A27 AEROPRACT A-27</SelectItem>
                  <SelectItem value="a29">A29 AVANTAGE A-29</SelectItem>
                  <SelectItem value="a30b">A30B AIRBUS A-300B4</SelectItem>
                  <SelectItem value="a31">A31 AVANTAGE Spectrum</SelectItem>
                  <SelectItem value="a33">A33 AEROPRACT A-33</SelectItem>
                  <SelectItem value="a35">A35 AVANTAGE A-35 Scanner</SelectItem>
                  <SelectItem value="a35k">A35K AIRBUS A350-1000 XWB</SelectItem>
                  <SelectItem value="a50">A50 ILYSHIN A-50</SelectItem>
                  <SelectItem value="a002">A002 IRKUT A002</SelectItem>
                  <SelectItem value="a109">A109 AGUSTA AW109, AW109 GRAND, AW109 GRANDNEW</SelectItem>
                  <SelectItem value="a119">A119 AUGUSTA AW-119 KOALA</SelectItem>
                  <SelectItem value="a122">A122 AEROTECNIAS</SelectItem>
                  <SelectItem value="a124">A124 ANTONOV AN-124</SelectItem>
                  <SelectItem value="a139">A139 AGUSTA AW-139</SelectItem>
                  <SelectItem value="a140">A140 ANTONOV AN-140</SelectItem>
                  <SelectItem value="a148">A148 ANTONOV AN-148</SelectItem>
                  <SelectItem value="a158">A158 ANTONOV AN-158</SelectItem>
                  <SelectItem value="a169">A169 AGUSTA AW-169</SelectItem>
                  <SelectItem value="a189">A189 AGUSTA AW-189</SelectItem>
                  <SelectItem value="a210">A210 AQUILA A-210</SelectItem>
                  <SelectItem value="a225">A225 ANTONOV AN-225 MRIYA</SelectItem>
                  <SelectItem value="a251">A251 AVIATIK-ALYANS 251</SelectItem>
                  <SelectItem value="a270">A270 AERO Ae-270 Ibis</SelectItem>
                  <SelectItem value="a306">A306 AIRBUS A-300F4-600</SelectItem>
                  <SelectItem value="a310">A310 AIRBUS A-310</SelectItem>
                  <SelectItem value="a318">A318 AIRBUS A-318</SelectItem>
                  <SelectItem value="a319">A319 AIRBUS A-319</SelectItem>
                  <SelectItem value="a320">A320 AIRBUS A-320</SelectItem>
                  <SelectItem value="a321">A321 AIRBUS A-321</SelectItem>
                  <SelectItem value="a332">A332 AIRBUS A-330-200</SelectItem>
                  <SelectItem value="a333">A333 AIRBUS A-330-300</SelectItem>
                  <SelectItem value="a342">A342 AIRBUS A-340-200</SelectItem>
                  <SelectItem value="a343">A343 AIRBUS A-340-300</SelectItem>
                  <SelectItem value="a345">A345 AIRBUS A-340-500</SelectItem>
                  <SelectItem value="a346">A346 AIRBUS A-340-600</SelectItem>
                  <SelectItem value="a358">A358 AIRBUS A350-800 XWB</SelectItem>
                  <SelectItem value="a359">A359 AIRBUS A350-900 XWB</SelectItem>
                  <SelectItem value="a388">A388 AIRBUS A380-800</SelectItem>
                  <SelectItem value="a500">A500 ADAM A-500</SelectItem>
                  <SelectItem value="a600">A600 ROTORWAY A-600 Talon</SelectItem>
                  <SelectItem value="a660">A660 AYRES S-2R-T660 TURBO</SelectItem>
                  <SelectItem value="a700">A700 ADAM A-700 Adamjet</SelectItem>
                  <SelectItem value="a743">A743 ANTONOV An-74-300</SelectItem>
                  <SelectItem value="a748">A748 AIL 748</SelectItem>
                  <SelectItem value="a900">A900 AVIATIKA MAI-900</SelectItem>
                  <SelectItem value="aa1">AA1 AMERICAN AA-1 Trainer</SelectItem>
                  <SelectItem value="aa5">AA5 AMERICAN AA-5 Trainer</SelectItem>
                  <SelectItem value="aa37">AA37 AEROPRACT A-37</SelectItem>
                  <SelectItem value="aat3">AAT3 AERO AT-3</SelectItem>
                  <SelectItem value="aat4">AAT4 AERO AT-4</SelectItem>
                  <SelectItem value="ab15">AB15 AERO BOERO, AB-150</SelectItem>
                  <SelectItem value="ab18">AB18 AERO BOERO, AB-180</SelectItem>
                  <SelectItem value="ab95">AB95 AERO BOERO, AB-95</SelectItem>
                  <SelectItem value="ac4">AC4 LIGHT WING, AC-4</SelectItem>
                  <SelectItem value="ac6l">AC6L AERO COMMANDER</SelectItem>
                  <SelectItem value="ac11">AC11 COMMANDER 115</SelectItem>
                  <SelectItem value="ac31">AC31 AVICOPTER AC-311</SelectItem>
                  <SelectItem value="ac33">AC33 AVICOPTER AC-313</SelectItem>
                  <SelectItem value="ac50">AC50 AERO, Commander 500, 520, 560</SelectItem>
                  <SelectItem value="ac68">AC68 AERO, Commander 680E</SelectItem>
                  <SelectItem value="ac72">AC72 AERO COMMANDER 720</SelectItem>
                  <SelectItem value="ac80">AC80 AERO COMMANDER 680 TurboCommander</SelectItem>
                  <SelectItem value="ac90">AC90 GULFSTREAM AMERICAN 690, 695 Jetprop COMMANDER</SelectItem>
                  <SelectItem value="acar">ACAR AUSTER J-5T Autocar</SelectItem>
                  <SelectItem value="acr2">ACR2 ACRO SPORT</SelectItem>
                  <SelectItem value="aerk">AERK AERONCA</SelectItem>
                  <SelectItem value="aest">AEST AEROSTAR</SelectItem>
                  <SelectItem value="aj27">AJ27 COMAC ARJ-21 700</SelectItem>
                  <SelectItem value="akro">AKRO STEPHENS</SelectItem>
                  <SelectItem value="algr">ALGR FANTASY AIR</SelectItem>
                  <SelectItem value="alh">ALH HINDUSTAN ALH Dhruv</SelectItem>
                  <SelectItem value="alig">ALIG ARION</SelectItem>
                  <SelectItem value="alsl">ALSL AIRLONY Skylane</SelectItem>
                  <SelectItem value="alto">ALTO DIRECT FLY</SelectItem>
                  <SelectItem value="an24">AN24 ANTONOV AN-24</SelectItem>
                  <SelectItem value="an26">AN26 ANTONOV AN-26</SelectItem>
                  <SelectItem value="an32">AN32 ANTONOV AN-32</SelectItem>
                  <SelectItem value="an72">AN72 ANTONOV AN-72</SelectItem>
                  <SelectItem value="anst">ANST KAZAN</SelectItem>
                  <SelectItem value="apm2">APM2 ISSOIRE AMP-21 Lion</SelectItem>
                  <SelectItem value="amp3">AMP3 ISSOIRE AMP-30 Lion</SelectItem>
                  <SelectItem value="ar11">AR11 AERONCA Chief</SelectItem>
                  <SelectItem value="ar15">AR15 AERONCA 15 Sedan</SelectItem>
                  <SelectItem value="arce">ARCE SCHEMPP-HIRTH</SelectItem>
                  <SelectItem value="as3b">AS3B AS32 EUROCOPTER Super Puma</SelectItem>
                  <SelectItem value="as20">AS20 SCHLEICHER ASW-20</SelectItem>
                  <SelectItem value="as50">AS50 AS55 EUROCOPTER Ecureuil</SelectItem>
                  <SelectItem value="as65">AS65 EUROCOPTER AS-365 Dauphin</SelectItem>
                  <SelectItem value="asto">ASTO TECNAM</SelectItem>
                  <SelectItem value="astr">ASTR IAI GULFSTREAM G100</SelectItem>
                  <SelectItem value="at8t">AT8T AIR TRACTOR</SelectItem>
                  <SelectItem value="at43">AT43 ATR 42-300</SelectItem>
                  <SelectItem value="at44">AT44 ATR 42-400</SelectItem>
                  <SelectItem value="at45">AT45 ATR 42-500</SelectItem>
                  <SelectItem value="at75">AT75 ATR 72-500</SelectItem>
                  <SelectItem value="atp">ATP BRITISH AEROSPACE ATP</SelectItem>
                  <SelectItem value="b06">B06 BELL 406</SelectItem>
                  <SelectItem value="b06t">B06T BELL 206LT TwinRanger</SelectItem>
                  <SelectItem value="b13">B13 AKAFLIEG BERLIN B_13</SelectItem>
                  <SelectItem value="b36t">B36T ALLISON 36 Turbine Bonanza</SelectItem>
                  <SelectItem value="b58t">B58T BEECH 58 Baron</SelectItem>
                  <SelectItem value="b60t">B60T BEECH 60 Duke</SelectItem>
                  <SelectItem value="b74s">B74S BOEING 747SP</SelectItem>
                  <SelectItem value="b77l">B77L BOEING 777-200LR</SelectItem>
                  <SelectItem value="b77w">B77W BOEING 777-300ER</SelectItem>
                  <SelectItem value="b78x">B78X BOEING 787-10 Dreamliner</SelectItem>
                  <SelectItem value="b105">B105 EUROCOPTER Super Five</SelectItem>
                  <SelectItem value="b190">B190 BEECH 1900</SelectItem>
                  <SelectItem value="b212">B212 BELL 212</SelectItem>
                  <SelectItem value="b214">B214 BELL 214</SelectItem>
                  <SelectItem value="b222">B222 BELL 222</SelectItem>
                  <SelectItem value="b230">B230 BELL 230</SelectItem>
                  <SelectItem value="b350">B350 BEECHCRAFT King Air 350</SelectItem>
                  <SelectItem value="b407">B407 BELL 407</SelectItem>
                  <SelectItem value="b412">B412 BELL 412</SelectItem>
                  <SelectItem value="b427">B427 BELL 427</SelectItem>
                  <SelectItem value="b429">B429 BELL 429</SelectItem>
                  <SelectItem value="b430">B430 BELL 430</SelectItem>
                  <SelectItem value="b461">B461 B463 BRITISH AEROSPACE BAe 146</SelectItem>
                  <SelectItem value="b525">B525 BELL 525</SelectItem>
                  <SelectItem value="b712">B712 BOEING 717-200</SelectItem>
                  <SelectItem value="b721">B721 BOEING 727-100</SelectItem>
                  <SelectItem value="b722">B722 BOEING 727-200</SelectItem>
                  <SelectItem value="b732">B732 BOEING 737-200</SelectItem>
                  <SelectItem value="b733">B733 BOEING 737-300</SelectItem>
                  <SelectItem value="b734">B734 BOEING 737-400</SelectItem>
                  <SelectItem value="b735">B735 BOEING 737-500</SelectItem>
                  <SelectItem value="b736">B736 BOEING 737-600</SelectItem>
                  <SelectItem value="b737">B737 BOEING 737-700, BBJ, MAX 7</SelectItem>
                  <SelectItem value="b738">B738 BOEING 737-800,BBJ2, MAX 8</SelectItem>
                  <SelectItem value="b739">B739 BOEING 737-900,BBJ3, MAX 9</SelectItem>
                  <SelectItem value="b743">B743 BOEING 747-300</SelectItem>
                  <SelectItem value="b744">B744 BOEING 747-400</SelectItem>
                  <SelectItem value="b748">B748 BOEING 747-800</SelectItem>
                  <SelectItem value="b752">B752 BOEING 757-200</SelectItem>
                  <SelectItem value="b753">B753 BOEING 757-300</SelectItem>
                  <SelectItem value="b762">B762 BOEING 767-200</SelectItem>
                  <SelectItem value="b763">B763 BOEING 767-300</SelectItem>
                  <SelectItem value="b764">B764 BOEING 767-400</SelectItem>
                  <SelectItem value="b772">B772 BOEING 777-200ER</SelectItem>
                  <SelectItem value="b773">B773 BOEING 777-300</SelectItem>
                  <SelectItem value="b778">B778 BOEING 777-8</SelectItem>
                  <SelectItem value="b779">B779 BOEING 777-9</SelectItem>
                  <SelectItem value="b788">B788 BOEING 787-8 Dreamliner</SelectItem>
                  <SelectItem value="b789">B789 BOEING 787-9 Dreamliner</SelectItem>
                  <SelectItem value="ball">BALL (ANY MANUFACTURER) BALLOON</SelectItem>
                  <SelectItem value="bar6">BAR6 BARR BarrSix</SelectItem>
                  <SelectItem value="bcs1">BCS1 BOMBARDIER CSeries CS100</SelectItem>
                  <SelectItem value="bcs3">BCS3 BOMBARDIER CSeries CS300</SelectItem>
                  <SelectItem value="be9l">BE9L BEECH 90 King Air</SelectItem>
                  <SelectItem value="be10">BE10 BEECH 100 King Air</SelectItem>
                  <SelectItem value="be19">BE19 BEECH 19 Musketeer Sport</SelectItem>
                  <SelectItem value="be20">BE20 BEECHCRAFT 200 King Air 250</SelectItem>
                  <SelectItem value="be23">BE23 BEECH 23 Musketter</SelectItem>
                  <SelectItem value="be24">BE24 BEECH 24 Sierra</SelectItem>
                  <SelectItem value="be30">BE30 BEECHCRAFT 300 King Air 300</SelectItem>
                  <SelectItem value="be36">BE36 BEECH Bonanza</SelectItem>
                  <SelectItem value="be40">BE40 HAWKER BEECHCRAFT, Hawker400</SelectItem>
                  <SelectItem value="be58">BE58 BEECHCRAFT 58 Baron</SelectItem>
                  <SelectItem value="be60">BE60 BEECH 60 Duke</SelectItem>
                  <SelectItem value="be70">BE70 BEECH Queen Air</SelectItem>
                  <SelectItem value="be76">BE76 BEECH 76 Duchess</SelectItem>
                  <SelectItem value="be95">BE95 BEECH 95 Travel Air</SelectItem>
                  <SelectItem value="bisc">BISC BILSAM Sky Cruiser</SelectItem>
                  <SelectItem value="bk17">BK17 EUROCOPTER-KAWASAKI BK 117B</SelectItem>
                  <SelectItem value="bl8">BL8 BELLANCA 8 Decathlon</SelectItem>
                  <SelectItem value="bl17">BL17 BELLANCA Turbo Super Vikingo</SelectItem>
                  <SelectItem value="blcf">BLCF BOEING 747-400CF Dreamlifter</SelectItem>
                  <SelectItem value="bn2p">BN2P BN2T BRITTEN-NORMAN BN-2B BN-2T</SelectItem>
                  <SelectItem value="brez">BREZ AEROSTYLE Breezer</SelectItem>
                  <SelectItem value="bstp">BSTP BELL 214ST</SelectItem>
                  <SelectItem value="bt36">BT36 BEECH B36TC Bonanza</SelectItem>
                  <SelectItem value="bult">BULT BROKAW BJ-520 Bullet</SelectItem>
                  <SelectItem value="c04t">C04T CESSNA 404</SelectItem>
                  <SelectItem value="c06t">C06T CESSNA 206</SelectItem>
                  <SelectItem value="c08t">C08T SOLOY 208 Dual Pac Caravan</SelectItem>
                  <SelectItem value="c10t">C10T ADVANCED AIRCRAFT Sporting 750</SelectItem>
                  <SelectItem value="c14t">C14T CESSNA 414</SelectItem>
                  <SelectItem value="c12t">C12T ADVANCED AIRCRAFT Regent 1500</SelectItem>
                  <SelectItem value="c25a">C25A CESSNA Citation CJ2</SelectItem>
                  <SelectItem value="c25b">C25B CESSNA Citation CJ3</SelectItem>
                  <SelectItem value="c25c">C25C CESSNA Citation CJ4</SelectItem>
                  <SelectItem value="c25m">C25M CESSNA 525 Citation M2</SelectItem>
                  <SelectItem value="c55b">C55B CESSNA Citation Bravo</SelectItem>
                  <SelectItem value="c56x">C56X CESSNA Citation XLS</SelectItem>
                  <SelectItem value="c68a">C68A CESSNA 680A Citation Latitudes</SelectItem>
                  <SelectItem value="c72r">C72R CESSNA 172RG</SelectItem>
                  <SelectItem value="c77r">C77R CESSNA Cardinal RG</SelectItem>
                  <SelectItem value="c162">C162 CESSNA 162</SelectItem>
                  <SelectItem value="c172">C172 CESSNA 172</SelectItem>
                  <SelectItem value="c182">C182 CESSNA 182</SelectItem>
                  <SelectItem value="c205">C205 CESSNA 205</SelectItem>
                  <SelectItem value="c207">C207 CESSNA 207</SelectItem>
                  <SelectItem value="c208">C208 CESSNA 208 Caravan</SelectItem>
                  <SelectItem value="c150">C150 C152 CESSNA 150 152</SelectItem>
                  <SelectItem value="c210">C210 CESSNA 210</SelectItem>
                  <SelectItem value="c240">C240 CESSNA TTx</SelectItem>
                  <SelectItem value="c303">C303 CESSNA T303 Crusader</SelectItem>
                  <SelectItem value="c310">C310 CESSNA 310</SelectItem>
                  <SelectItem value="c320">C320 CESSNA 320</SelectItem>
                  <SelectItem value="c337">C337 CESSNA 337</SelectItem>
                  <SelectItem value="c340">C340 CESSNA 340</SelectItem>
                  <SelectItem value="c402">C402 CESSNA 402</SelectItem>
                  <SelectItem value="c404">C404 CESSNA 404</SelectItem>
                  <SelectItem value="c421">C421 CESSNA 421</SelectItem>
                  <SelectItem value="c441">C441 CESSNA 441 Conquest</SelectItem>
                  <SelectItem value="c500">C500 CESSNA Citation</SelectItem>
                  <SelectItem value="c510">C510 CESSNA Citation CJ1</SelectItem>
                  <SelectItem value="c550">C550 CESSNA Citation 2</SelectItem>
                  <SelectItem value="c560">C560 CESSNA Citation 5</SelectItem>
                  <SelectItem value="c650">C650 CESSNA 650</SelectItem>
                  <SelectItem value="c680">C680 CESSNA Citation Sovereign</SelectItem>
                  <SelectItem value="c750">C750 CESSNA Citation 10</SelectItem>
                  <SelectItem value="ch7">CH7 HELI-SPORT</SelectItem>
                  <SelectItem value="ch14">CH14 CICARE</SelectItem>
                  <SelectItem value="chgo">CHGO KOREAN AIR CHK-91</SelectItem>
                  <SelectItem value="cl2p">CL2P CANADAIR CL-215</SelectItem>
                  <SelectItem value="cl30">CL30 BOMBARDIER Challenger 300</SelectItem>
                  <SelectItem value="cl35">CL35 BOMBARDIER Challenger 350</SelectItem>
                  <SelectItem value="cl60">CL60 BOMBARDIER Challenger 600,601,604,605,650</SelectItem>
                  <SelectItem value="clb1">CLB1 AERO COMMANDER</SelectItem>
                  <SelectItem value="col4">COL4 CESSNA 400 Corvalis TT</SelectItem>
                  <SelectItem value="cp65">CP65 PORTERFIELD CP-65</SelectItem>
                  <SelectItem value="cres">CRES NEW ZEALAND Crespo</SelectItem>
                  <SelectItem value="crj1">CRJ1 CANADAIR CRJ-100</SelectItem>
                  <SelectItem value="crj2">CRJ2 CANADAIR CRJ-200 Challenger 800,850</SelectItem>
                  <SelectItem value="crj7">CRJ7 CANADAIR CRJ-700</SelectItem>
                  <SelectItem value="crj9">CRJ9 CANADAIR CRJ-900 Challenger 890</SelectItem>
                  <SelectItem value="crjx">CRJX BOMBARDIER CRJ-1000</SelectItem>
                  <SelectItem value="cruz">CRUZ CSA, Pipersport</SelectItem>
                  <SelectItem value="cvlp">CVLP Convair - C-131</SelectItem>
                  <SelectItem value="d1">D1 Derringer, New Derringer</SelectItem>
                  <SelectItem value="d5">D5 Auster, D-5</SelectItem>
                  <SelectItem value="d28t">D28T Dornier, 128-6 Turbo Skyservant</SelectItem>
                  <SelectItem value="d39">D39 Akaflieg Darmstadt, D-39</SelectItem>
                  <SelectItem value="d140">D140 JODEL, D-140 Abeille</SelectItem>
                  <SelectItem value="d150">D150 JODEL, D-150 Mascaret</SelectItem>
                  <SelectItem value="d228">D228 DO228 DORNIER, 228</SelectItem>
                  <SelectItem value="d328">D328 DO328 DORNIER, 328</SelectItem>
                  <SelectItem value="da40">DA40 DIAMOND, DA-40 Katana</SelectItem>
                  <SelectItem value="da42">DA42 DIAMOND, DA-42 Twin Star</SelectItem>
                  <SelectItem value="da50">DA50 DIAMOND, DA-50SuperStar</SelectItem>
                  <SelectItem value="da62">DA62 DIAMOND, DA-62</SelectItem>
                  <SelectItem value="dal5">DAL5 DALLACH, Evolution</SelectItem>
                  <SelectItem value="dc3">DC3 DOUGLAS, DC-3</SelectItem>
                  <SelectItem value="dc10">DC10 BOEING, MD-10</SelectItem>
                  <SelectItem value="dc86">DC86 DOUGLAS, DC-8-60</SelectItem>
                  <SelectItem value="dc93">DC93 MCDONNELL DOUGLAS, DC-9-30</SelectItem>
                  <SelectItem value="dg1t">DG1T DG FLUGZEUGBAU, DG-1000T</SelectItem>
                  <SelectItem value="dg50">DG50 GLASER-DIRKS, DG-500M</SelectItem>
                  <SelectItem value="dh2t">DH2T DE HAVILLAND CANADA, DHC-2 Mk3 Turbo Beaver</SelectItem>
                  <SelectItem value="dh3t">DH3T DE HAVILLAND CANADA, DHC-3 Turbo Otter</SelectItem>
                  <SelectItem value="dh8a">DH8A DE HAVILLAND CANADA, DHC-8-100 Dash 8</SelectItem>
                  <SelectItem value="dhc2">DHC2 AIRTECH (1), Beaver</SelectItem>
                  <SelectItem value="dhc3">DHC3 DE HAVILLAND CANADA, Otter</SelectItem>
                  <SelectItem value="dhc6">DHC6 DE HAVILLAND CANADA, Twin Otter</SelectItem>
                  <SelectItem value="dimo">DIMO DIAMOND, HK-36 MPX</SelectItem>
                  <SelectItem value="disc">DISC SCHEMPP-HIRTH, Discus BT</SelectItem>
                  <SelectItem value="djet">DJET DIAMOND, DJ-1 D-Jet</SelectItem>
                  <SelectItem value="e35l">E35L EMBRAER, Legacy</SelectItem>
                  <SelectItem value="e45x">E45X EMBRAER, ERJ-145XR</SelectItem>
                  <SelectItem value="e50p">E50P EMBRAER, Phenom 100</SelectItem>
                  <SelectItem value="e55p">E55P EMBRAER, Phenom 300</SelectItem>
                  <SelectItem value="e75l">E75L EMBRAER, ERJ-170-200 (long wing)</SelectItem>
                  <SelectItem value="e75s">E75S EMBRAER, ERJ-170-200 (short wing)</SelectItem>
                  <SelectItem value="e110">E110 EMBRAER, EMB-111 Bandeirulha</SelectItem>
                  <SelectItem value="e120">E120 EMBRAER, EMB-120 Brasilia</SelectItem>
                  <SelectItem value="e121">E121 EMBRAER, Xingu</SelectItem>
                  <SelectItem value="e135">E135 EMBRAER, ERJ-135</SelectItem>
                  <SelectItem value="e145">E145 EMBRAER, EMB-145ER</SelectItem>
                  <SelectItem value="e170">E170 EMBRAER, 170</SelectItem>
                  <SelectItem value="e190">E190 EMBRAER, 190</SelectItem>
                  <SelectItem value="e350">E350 CESSNA, E350</SelectItem>
                  <SelectItem value="e545">E545 EMBRAER, EMB-545 Legacy 450</SelectItem>
                  <SelectItem value="e550">E550 EMBRAER, EMB-550 Legacy 500</SelectItem>
                  <SelectItem value="ea40">EA40 ECLIPSE, Eclipse 400</SelectItem>
                  <SelectItem value="ea50">EA50 ECLIPSE, Eclipse 500</SelectItem>
                  <SelectItem value="ec20">EC20 AIRBUS HELICOPTERS, H-120 Colibri</SelectItem>
                  <SelectItem value="ec25">EC25 AIRBUS HELICOPTERS, EC-225 Super Puma Mk2+</SelectItem>
                  <SelectItem value="ec30">EC30 AIRBUS HELICOPTERS, H-130</SelectItem>
                  <SelectItem value="ec35">EC35 AIRBUS HELICOPTERS, EC-635</SelectItem>
                  <SelectItem value="ec45">EC45 AIRBUS HELICOPTERS-KAWASAKI, H-145</SelectItem>
                  <SelectItem value="ec55">EC55 AIRBUS HELICOPTERS, H-155</SelectItem>
                  <SelectItem value="ec75">EC75 AIRBUS HELICOPTERS-HARBIN, EC-175</SelectItem>
                  <SelectItem value="echo">ECHO TECNAM, Eaglet</SelectItem>
                  <SelectItem value="egl3">EGL3 ROTORWAY, Eagle 300T</SelectItem>
                  <SelectItem value="elit">ELIT EPIC AIRCRAFT, Epic Elite</SelectItem>
                  <SelectItem value="en28">EN28 ENSTROM, F-28</SelectItem>
                  <SelectItem value="en48">EN48 ENSTROM, 480</SelectItem>
                  <SelectItem value="epic">EPIC EPIC AIRCRAFT, E-1000</SelectItem>
                  <SelectItem value="es11">ES11 ALPI, AH-130 Syton</SelectItem>
                  <SelectItem value="ev55">EV55 EVEKTOR, EV-55 Outback</SelectItem>
                  <SelectItem value="evop">EVOP LANCAIR, Evolution Piston</SelectItem>
                  <SelectItem value="evot">EVOT LANCAIR, Evolution Turbine</SelectItem>
                  <SelectItem value="ex5t">EX5T AEA, Explorer 500T</SelectItem>
                  <SelectItem value="expl">EXPL BOEING, MD-902 Explorer</SelectItem>
                  <SelectItem value="f2th">F2TH DASSAULT, Falcon 2000</SelectItem>
                  <SelectItem value="f50">F50 FOKKER, 50</SelectItem>
                  <SelectItem value="f70">F70 FOKKER, 70</SelectItem>
                  <SelectItem value="f100">F100 FOKKER, 100</SelectItem>
                  <SelectItem value="f406">F406 CESSNA, F406 Caravan 2</SelectItem>
                  <SelectItem value="f900">F900 DASSAULT, Falcon 900</SelectItem>
                  <SelectItem value="fa5x">FA5X DASSAULT, Falcon 5X</SelectItem>
                  <SelectItem value="fa7x">FA7X DASSAULT, Falcon 7X</SelectItem>
                  <SelectItem value="fa8x">FA8X DASSAULT, Falcon 8X</SelectItem>
                  <SelectItem value="fa04">FA04 FLAMING AIR , FA-04 Peregrine</SelectItem>
                  <SelectItem value="fa10">FA10 DASSAULT, Falcon 100</SelectItem>
                  <SelectItem value="fa20">FA20 DASSAULT, Falcon 20</SelectItem>
                  <SelectItem value="fa50">FA50 DASSAULT, Falcon 50</SelectItem>
                  <SelectItem value="g103">G103 GROB, Twin 3SL</SelectItem>
                  <SelectItem value="g150">G150 GULFSTREAM AEROSPACE, Gulfstream G150</SelectItem>
                  <SelectItem value="g159">G159 GRUMMAN, Gulfstream 1</SelectItem>
                  <SelectItem value="g250">G250 IAI, Gulfstream G250</SelectItem>
                  <SelectItem value="g280">G280 IAI, Gulfstream G280</SelectItem>
                  <SelectItem value="ga5c">GA5C GULFSTREAM AEROSPACE, G-7 Gulfstream G500</SelectItem>
                  <SelectItem value="ga6c">GA6C GULFSTREAM AEROSPACE, G-7 Gulfstream G600</SelectItem>
                  <SelectItem value="ga7">GA7 GRUMMAN AMERICAN, GA-7 Cougar</SelectItem>
                  <SelectItem value="ga8">GA8 GIPPSAERO, GA-8 Airvan</SelectItem>
                  <SelectItem value="ga10">GA10 GIPPSAERO, GA-10</SelectItem>
                  <SelectItem value="galx">GALX GULFSTREAM AEROSPACE, Gulfstream G200 L2J</SelectItem>
                  <SelectItem value="geni">GENI IFB, E-Genius</SelectItem>
                  <SelectItem value="gl5t">GL5T BOMBARDIER, Global 5000</SelectItem>
                  <SelectItem value="g7500">G7500 BOMBARDIER GLOBAL 7500</SelectItem>
                  <SelectItem value="g6500">G6500 BOMBARDIER GLOBAL 6500</SelectItem>
                  <SelectItem value="glf2">GLF2 GII GRUMMAN, Gulfstream 2</SelectItem>
                  <SelectItem value="glf3">GLF3 GIII GULFSTREAM AEROSPACE, Gulfstream 3</SelectItem>
                  <SelectItem value="glf4">GLF4 GVII GULFSTREAM AEROSPACE, Gulfstream 4, G-4X G450, G-4 G350, G-4 G400</SelectItem>
                  <SelectItem value="glf5">GLF5 GV GULFSTREAM AEROSPACE, G-5 Gulfstream 5, G-5SP G500, G-5SP G550</SelectItem>
                  <SelectItem value="glf6">GLF6 GVI GULFSTREAM AEROSPACE, Gulfstream G650</SelectItem>
                  <SelectItem value="gviii">GVIII GULFSTREAM AEROSPACE, Gulfstream G700 G800</SelectItem>
                  <SelectItem value="gm17">GM17 INTRACOM, Viper</SelectItem>
                  <SelectItem value="griz">GRIZ AEROTEK (3), Turbo Grizzly</SelectItem>
                  <SelectItem value="h25a">H25A HAWKER SIDDELEY, HS-125-1</SelectItem>
                  <SelectItem value="h25b">H25B HAWKER BEECHCRAFT, Hawker 750, 800, 850, 900, SIDDELEY HS-125-700</SelectItem>
                  <SelectItem value="h160">H160 AIRBUS HELICOPTERS, H-160</SelectItem>
                  <SelectItem value="h269">H269 HUGHES, 300</SelectItem>
                  <SelectItem value="h500">H500 AGUSTA, NH-500</SelectItem>
                  <SelectItem value="ha4t_beech">HA4T HAWKER BEECHCRAFT, Hawker 4000</SelectItem>
                  <SelectItem value="hcat">HCAT GRUMMAN, Hellcat</SelectItem>
                  <SelectItem value="hdjt">HDJT HONDA, HA-420 HondaJet</SelectItem>
                  <SelectItem value="ha4t_rayth">HA4T RAYTHEON, 4000 Hawker Horizon</SelectItem>
                  <SelectItem value="hsmt">HSMT ROTORSMART, HeliSmart</SelectItem>
                  <SelectItem value="husk">HUSK AVIAT, Husky</SelectItem>
                  <SelectItem value="lj45">LJ45 LEARJET, 45</SelectItem>
                  <SelectItem value="lj55">LJ55 LEARJET, 55</SelectItem>
                  <SelectItem value="lj60">LJ60 LEARJET, 60</SelectItem>
                  <SelectItem value="lj70">LJ70 LEARJET, 70</SelectItem>
                  <SelectItem value="lj75">LJ75 LEARJET, 75</SelectItem>
                  <SelectItem value="lk19">LK19 LAK, LAK-19T</SelectItem>
                  <SelectItem value="lk20">LK20 LAK, LAK-20M</SelectItem>
                  <SelectItem value="lnce">LNCE LANCAIR, Lancair Super ES</SelectItem>
                  <SelectItem value="lnp4">LNP4 LANCAIR, Lancair PropJet 4</SelectItem>
                  <SelectItem value="lnt4">LNT4 LANCAIR, Sentry 4T</SelectItem>
                  <SelectItem value="m4">M4 MAULE, M-4</SelectItem>
                  <SelectItem value="m5">M5 MAULE, M-5</SelectItem>
                  <SelectItem value="m8">M8 MAULE, M-8</SelectItem>
                  <SelectItem value="m9">M9 MAULE, M-9</SelectItem>
                  <SelectItem value="m20t">M20T MOONEY, M-20M TLS</SelectItem>
                  <SelectItem value="md11">MD11 BOEING, MD-11</SelectItem>
                  <SelectItem value="md52">MD52 BOEING, MD-520N</SelectItem>
                  <SelectItem value="md60">MD60 BOEING, MD-600N</SelectItem>
                  <SelectItem value="md81">MD81 BOEING, MD-81</SelectItem>
                  <SelectItem value="md82">MD82 BOEING, MD-82</SelectItem>
                  <SelectItem value="md83">MD83 BOEING, MD-83</SelectItem>
                  <SelectItem value="md87">MD87 BOEING, MD-87</SelectItem>
                  <SelectItem value="md88">MD88 BOEING, MD-88</SelectItem>
                  <SelectItem value="md90">MD90 BOEING, MD-90</SelectItem>
                  <SelectItem value="nimb">NIMB SCHEMPP-HIRTH, Nimbus 4M</SelectItem>
                  <SelectItem value="p28a">P28A PIPER, PA-28-140 Cherokee Cruiser</SelectItem>
                  <SelectItem value="p28b">P28B PIPER, PA-28-235 Cherokee</SelectItem>
                  <SelectItem value="p28r">P28R PIPER, Arrow</SelectItem>
                  <SelectItem value="p28t">P28T PIPER, PA-28RT-201 Arrow 4</SelectItem>
                  <SelectItem value="p32t">P32T EMBRAER, PA-32RT-300 Lance 2, PIPER, PA-32RT-300T Turbo Lance 2</SelectItem>
                  <SelectItem value="p46t">P46T PIPER, Malibu Meridian</SelectItem>
                  <SelectItem value="p180">P180 PIAGGIO, P-180 Avanti</SelectItem>
                  <SelectItem value="p208">P208 TECNAM, P-2008</SelectItem>
                  <SelectItem value="p337">P337 CESSNA, P337 Pressurized Skymaster</SelectItem>
                  <SelectItem value="p750">P750 PACIFIC AEROSPACE, 750XL</SelectItem>
                  <SelectItem value="pa23">PA23 PIPER, Apache</SelectItem>
                  <SelectItem value="pa24">PA24 PIPER, Comanche</SelectItem>
                  <SelectItem value="pa27">PA27 PIPER, U-11 Aztec</SelectItem>
                  <SelectItem value="pa30">PA30 PIPER, Turbo Twin Comanche</SelectItem>
                  <SelectItem value="pa31">PA31 PIPER, PA-31-325 Navajo CR</SelectItem>
                  <SelectItem value="pa32">PA32 PIPER, Saratoga</SelectItem>
                  <SelectItem value="pa34">PA34 PIPER, Seneca</SelectItem>
                  <SelectItem value="pa44">PA44 PIPER, Seminole</SelectItem>
                  <SelectItem value="pa46">PA46 PIPER, Malibu</SelectItem>
                  <SelectItem value="pay1">PAY1 PIPER, Cheyenne 1</SelectItem>
                  <SelectItem value="pay3">PAY3 PIPER, Cheyenne 3</SelectItem>
                  <SelectItem value="pay4">PAY4 PIPER, Cheyenne 400</SelectItem>
                  <SelectItem value="pc6t">PC6T PILATUS, PC-6C Turbo-Porter</SelectItem>
                  <SelectItem value="pc12">PC12 PILATUS, PC-12</SelectItem>
                  <SelectItem value="pc24">PC24 PILATUS, PC-24</SelectItem>
                  <SelectItem value="pivi">PIVI PIPISTREL, Virus</SelectItem>
                  <SelectItem value="prm1">PRM1 RAYTHEON, Premier 1</SelectItem>
                  <SelectItem value="r22">R22 ROBINSON, R-22</SelectItem>
                  <SelectItem value="r44">R44 ROBINSON, R-44 Raven</SelectItem>
                  <SelectItem value="r66">R66 ROBINSON, R-66</SelectItem>
                  <SelectItem value="s22t">S22T CIRRUS, SR-22T, SR22 Turbo</SelectItem>
                  <SelectItem value="s76">S76 SIKORSKY, S-76</SelectItem>
                  <SelectItem value="s92">S92 SIKORSKY, H-92 Superhawk</SelectItem>
                  <SelectItem value="sb20">SB20 SAAB, 2000</SelectItem>
                  <SelectItem value="sbr1">SBR1 ROCKWELL, Sabre 40, 60, 65</SelectItem>
                  <SelectItem value="sbr2">SBR2 ROCKWELL, Sabre 75, 80</SelectItem>
                  <SelectItem value="sf34">SF34 SAAB, 340</SelectItem>
                  <SelectItem value="sf50">SF50 CIRRUS, SJ-X Vision</SelectItem>
                  <SelectItem value="sr20">SR20 CIRRUS, SR-20</SelectItem>
                  <SelectItem value="sr22">SR22 CIRRUS, SR-22</SelectItem>
                  <SelectItem value="su95">SU95 SUKHOI, Superjet 100-95</SelectItem>
                  <SelectItem value="sw3">SW3 FAIRCHILD (1), Merlin 3</SelectItem>
                  <SelectItem value="sw4">SW4 FAIRCHILD (1), Merlin 4</SelectItem>
                  <SelectItem value="t206">T206 CESSNA, T206 Turbo Stationair</SelectItem>
                  <SelectItem value="t210">T210 CESSNA, T210 Turbo Centurion</SelectItem>
                  <SelectItem value="lr_jet">LR LR-JET</SelectItem>
                  <SelectItem value="lr_jet_lj">LR-JET LJ 20-30-55</SelectItem>
                  <SelectItem value="na265">NA-265 Sabreliner 75A/80</SelectItem>
                  <SelectItem value="61717">61717 hhanana</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedValue === "other" && (
              <>
                <div className="space-y-2">
                  <Label>ICAO Code</Label>
                  <Input name="icaoCode" placeholder="A140" className="rounded-2xl py-6" />
                </div>
                
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input name="model" placeholder="Antonov An-140" className="rounded-2xl py-6" />
                  <div className="flex justify-end pt-1">
                    <a href="#" className="flex items-center text-blue-600 hover:text-blue-700 text-sm gap-1">
                      Complete-ICAO-Codes.pdf <Globe className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t bg-white mt-auto">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-200" />
              ) : (
                "Add Rating"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
