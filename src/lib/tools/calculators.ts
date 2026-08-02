export type LoanPayment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type LoanResult = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: LoanPayment[];
};

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")} ถึง ${max.toLocaleString("th-TH")}`);
  }
}

export function calculateLoan(principal: number, annualRate: number, months: number): LoanResult {
  assertFiniteInRange(principal, "วงเงินกู้", 1, 1_000_000_000);
  assertFiniteInRange(annualRate, "อัตราดอกเบี้ย", 0, 100);
  assertFiniteInRange(months, "จำนวนงวด", 1, 600);
  if (!Number.isInteger(months)) throw new Error("จำนวนงวดต้องเป็นจำนวนเต็ม");

  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = monthlyRate === 0
    ? principal / months
    : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);

  let balance = principal;
  let totalInterest = 0;
  const schedule: LoanPayment[] = [];

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    const principalPayment = month === months ? balance : Math.min(monthlyPayment - interest, balance);
    const payment = principalPayment + interest;
    balance = Math.max(0, balance - principalPayment);
    totalInterest += interest;
    schedule.push({ month, payment, principal: principalPayment, interest, balance });
  }

  return {
    monthlyPayment,
    totalPayment: principal + totalInterest,
    totalInterest,
    schedule,
  };
}

export type BmiCategory = "น้ำหนักต่ำกว่าเกณฑ์" | "น้ำหนักปกติ" | "น้ำหนักเกิน" | "โรคอ้วนระดับ 1" | "โรคอ้วนระดับ 2" | "โรคอ้วนระดับ 3";

export type BmiResult = {
  bmi: number;
  category: BmiCategory;
  healthyWeightMin: number;
  healthyWeightMax: number;
};

function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "น้ำหนักต่ำกว่าเกณฑ์";
  if (bmi < 25) return "น้ำหนักปกติ";
  if (bmi < 30) return "น้ำหนักเกิน";
  if (bmi < 35) return "โรคอ้วนระดับ 1";
  if (bmi < 40) return "โรคอ้วนระดับ 2";
  return "โรคอ้วนระดับ 3";
}

export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  assertFiniteInRange(weightKg, "น้ำหนัก", 1, 500);
  assertFiniteInRange(heightCm, "ส่วนสูง", 50, 250);
  const heightMetres = heightCm / 100;
  const bmi = weightKg / heightMetres ** 2;
  return {
    bmi,
    category: classifyBmi(bmi),
    healthyWeightMin: 18.5 * heightMetres ** 2,
    healthyWeightMax: 24.9 * heightMetres ** 2,
  };
}

export type ProfitMarginResult = {
  revenue: number;
  totalCost: number;
  profit: number;
  marginPercent: number;
  markupPercent: number | null;
};

export function calculateProfitMargin(costPerUnit: number, sellingPricePerUnit: number, quantity: number): ProfitMarginResult {
  assertFiniteInRange(costPerUnit, "ต้นทุนต่อชิ้น", 0, 1_000_000_000);
  assertFiniteInRange(sellingPricePerUnit, "ราคาขายต่อชิ้น", 0.01, 1_000_000_000);
  assertFiniteInRange(quantity, "จำนวน", 0.01, 1_000_000_000);
  const revenue = sellingPricePerUnit * quantity;
  const totalCost = costPerUnit * quantity;
  const profit = revenue - totalCost;
  return {
    revenue,
    totalCost,
    profit,
    marginPercent: (profit / revenue) * 100,
    markupPercent: totalCost === 0 ? null : (profit / totalCost) * 100,
  };
}
