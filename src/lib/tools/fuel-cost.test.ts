import { describe, expect, it } from "vitest";
import { calculateFuelCost } from "@/lib/tools/fuel-cost";

describe("calculateFuelCost", () => {
  const example = {
    distanceKm: 350,
    tripDirection: "round-trip" as const,
    fuelEfficiency: 14,
    efficiencyUnit: "km-per-liter" as const,
    fuelPricePerLiter: 36.5,
    passengers: 3,
    tolls: 200,
    parking: 100,
    otherCosts: 0,
  };

  it("calculates a round trip with Thai km/L inputs and shared costs", () => {
    const result = calculateFuelCost(example);

    expect(result.totalDistanceKm).toBe(700);
    expect(result.litersNeeded).toBe(50);
    expect(result.fuelCost).toBe(1_825);
    expect(result.additionalCosts).toBe(300);
    expect(result.totalTripCost).toBe(2_125);
    expect(result.costPerPerson).toBeCloseTo(708.333333, 6);
    expect(result.totalCostPerKm).toBeCloseTo(3.035714, 6);
  });

  it("supports liters per 100 km without changing the trip formula", () => {
    const result = calculateFuelCost({
      ...example,
      distanceKm: 250,
      tripDirection: "one-way",
      fuelEfficiency: 8,
      efficiencyUnit: "liters-per-100km",
      fuelPricePerLiter: 40,
      passengers: 1,
      tolls: 0,
      parking: 0,
    });

    expect(result.totalDistanceKm).toBe(250);
    expect(result.effectiveKmPerLiter).toBe(12.5);
    expect(result.effectiveLitersPer100Km).toBe(8);
    expect(result.litersNeeded).toBe(20);
    expect(result.fuelCost).toBe(800);
    expect(result.totalTripCost).toBe(800);
  });

  it("keeps fuel and extra costs separate", () => {
    const result = calculateFuelCost({ ...example, tolls: 120, parking: 80, otherCosts: 50 });
    expect(result.additionalCosts).toBe(250);
    expect(result.totalTripCost).toBe(result.fuelCost + 250);
    expect(result.fuelCostPerKm).toBeCloseTo(result.fuelCost / result.totalDistanceKm, 10);
  });

  it("does not round intermediate values", () => {
    const result = calculateFuelCost({ ...example, distanceKm: 123.45, tripDirection: "one-way", fuelEfficiency: 13.7, fuelPricePerLiter: 37.29 });
    expect(result.litersNeeded).toBeCloseTo(9.0109489051, 10);
    expect(result.fuelCost).toBeCloseTo(336.0182846715, 10);
  });

  it("rejects invalid distance, economy, price, passengers, and expenses", () => {
    expect(() => calculateFuelCost({ ...example, distanceKm: 0 })).toThrow("ระยะทาง");
    expect(() => calculateFuelCost({ ...example, fuelEfficiency: 0 })).toThrow("อัตราสิ้นเปลือง");
    expect(() => calculateFuelCost({ ...example, fuelPricePerLiter: 0 })).toThrow("ราคาน้ำมัน");
    expect(() => calculateFuelCost({ ...example, passengers: 1.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateFuelCost({ ...example, tolls: -1 })).toThrow("ค่าทางด่วน");
  });
});
