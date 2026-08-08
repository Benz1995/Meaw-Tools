export type FuelEfficiencyUnit = "km-per-liter" | "liters-per-100km";
export type TripDirection = "one-way" | "round-trip";

export type FuelCostInput = {
  distanceKm: number;
  tripDirection: TripDirection;
  fuelEfficiency: number;
  efficiencyUnit: FuelEfficiencyUnit;
  fuelPricePerLiter: number;
  passengers: number;
  tolls: number;
  parking: number;
  otherCosts: number;
};

export type FuelCostResult = {
  totalDistanceKm: number;
  effectiveKmPerLiter: number;
  effectiveLitersPer100Km: number;
  litersNeeded: number;
  fuelCost: number;
  additionalCosts: number;
  totalTripCost: number;
  fuelCostPerKm: number;
  totalCostPerKm: number;
  costPerPerson: number;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertMoney(value: number, label: string) {
  assertRange(value, label, 0, 100_000_000);
}

export function calculateFuelCost(input: FuelCostInput): FuelCostResult {
  assertRange(input.distanceKm, "ระยะทาง", 0.01, 1_000_000);
  assertRange(input.fuelEfficiency, "อัตราสิ้นเปลืองเชื้อเพลิง", 0.01, 1_000);
  assertRange(input.fuelPricePerLiter, "ราคาน้ำมันต่อลิตร", 0.01, 10_000);
  if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > 100) {
    throw new Error("จำนวนคนหารค่าเดินทางต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 100 คน");
  }
  assertMoney(input.tolls, "ค่าทางด่วนและค่าผ่านทาง");
  assertMoney(input.parking, "ค่าจอดรถ");
  assertMoney(input.otherCosts, "ค่าใช้จ่ายอื่น");

  const totalDistanceKm = input.tripDirection === "round-trip" ? input.distanceKm * 2 : input.distanceKm;
  const effectiveKmPerLiter = input.efficiencyUnit === "km-per-liter"
    ? input.fuelEfficiency
    : 100 / input.fuelEfficiency;
  const effectiveLitersPer100Km = input.efficiencyUnit === "liters-per-100km"
    ? input.fuelEfficiency
    : 100 / input.fuelEfficiency;
  const litersNeeded = input.efficiencyUnit === "km-per-liter"
    ? totalDistanceKm / input.fuelEfficiency
    : totalDistanceKm * (input.fuelEfficiency / 100);
  const fuelCost = litersNeeded * input.fuelPricePerLiter;
  const additionalCosts = input.tolls + input.parking + input.otherCosts;
  const totalTripCost = fuelCost + additionalCosts;

  if (!Number.isFinite(totalTripCost) || totalTripCost > 1_000_000_000_000) {
    throw new Error("ผลรวมสูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }

  return {
    totalDistanceKm,
    effectiveKmPerLiter,
    effectiveLitersPer100Km,
    litersNeeded,
    fuelCost,
    additionalCosts,
    totalTripCost,
    fuelCostPerKm: fuelCost / totalDistanceKm,
    totalCostPerKm: totalTripCost / totalDistanceKm,
    costPerPerson: totalTripCost / input.passengers,
  };
}
