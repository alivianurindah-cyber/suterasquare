export interface ElectricityReading {
  netUsage: number; // kWh
}

export interface WaterReading {
  netUsage: number; // m3
}

export const calculateElectricity = (usage: number) => {
  const currentCharge = usage * 0.509;
  const icpt = usage * 0.037;
  const kwtbb = currentCharge * 0.016; // 1.6%
  const total = currentCharge + icpt + kwtbb;
  return {
    currentCharge,
    icpt,
    kwtbb,
    total
  };
};

export const calculateWater = (usage: number) => {
  // usage * RM 0.66 - discount RM 0.08 per m3
  const rate = 0.66;
  const discountPerUnit = 0.08;
  const baseCost = usage * rate;
  const totalDiscount = usage * discountPerUnit;
  const total = baseCost - totalDiscount;
  return {
    baseCost,
    totalDiscount,
    total
  };
};
