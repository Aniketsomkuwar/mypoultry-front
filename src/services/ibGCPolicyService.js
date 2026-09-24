/**
 * IB Group GC Policy Calculation Engine
 * Policy Version: IB_GC_POLICY_2025_2026
 * Applicable: Placements from 16 October 2025 to 15 October 2026
 * Environment: EC Sheds (Environmentally Controlled)
 *
 * Pure calculation service - strictly no UI dependencies.
 */

export const SHED_CATEGORIES = [
  'Other Basic EC',
  'Parivartan Basic EC',
  'Other Semi EC',
  'Parivartan Semi EC',
  'Other EC',
  'Parivartan EC',
];

export const GC_POLICY_VERSION = 'IB_GC_POLICY_2025_2026';

// Payout Slabs Table (Rate in INR per KG)
export const GC_SLABS = [
  {
    min: -Infinity,
    max: 1.350,
    label: '1.350 and below',
    rates: {
      'Other Basic EC': 12.75,
      'Parivartan Basic EC': 12.75,
      'Other Semi EC': 13.00,
      'Parivartan Semi EC': 13.50,
      'Other EC': 13.50,
      'Parivartan EC': 14.75,
    },
  },
  {
    min: 1.350,
    max: 1.400,
    label: '1.351 to 1.400',
    rates: {
      'Other Basic EC': 12.25,
      'Parivartan Basic EC': 12.25,
      'Other Semi EC': 12.50,
      'Parivartan Semi EC': 13.00,
      'Other EC': 13.00,
      'Parivartan EC': 14.25,
    },
  },
  {
    min: 1.400,
    max: 1.450,
    label: '1.401 to 1.450',
    rates: {
      'Other Basic EC': 11.75,
      'Parivartan Basic EC': 11.75,
      'Other Semi EC': 12.00,
      'Parivartan Semi EC': 12.50,
      'Other EC': 12.50,
      'Parivartan EC': 13.75,
    },
  },
  {
    min: 1.450,
    max: 1.500,
    label: '1.451 to 1.500',
    rates: {
      'Other Basic EC': 11.25,
      'Parivartan Basic EC': 11.25,
      'Other Semi EC': 11.50,
      'Parivartan Semi EC': 12.00,
      'Other EC': 12.00,
      'Parivartan EC': 13.00,
    },
  },
  {
    min: 1.500,
    max: 1.550,
    label: '1.501 to 1.550',
    rates: {
      'Other Basic EC': 10.75,
      'Parivartan Basic EC': 10.75,
      'Other Semi EC': 11.00,
      'Parivartan Semi EC': 11.25,
      'Other EC': 11.25,
      'Parivartan EC': 12.00,
    },
  },
  {
    min: 1.550,
    max: 1.600,
    label: '1.551 to 1.600',
    rates: {
      'Other Basic EC': 10.00,
      'Parivartan Basic EC': 10.00,
      'Other Semi EC': 10.25,
      'Parivartan Semi EC': 10.50,
      'Other EC': 10.50,
      'Parivartan EC': 11.50,
    },
  },
  {
    min: 1.600,
    max: 1.650,
    label: '1.601 to 1.650',
    rates: {
      'Other Basic EC': 8.00,
      'Parivartan Basic EC': 8.00,
      'Other Semi EC': 8.00,
      'Parivartan Semi EC': 8.00,
      'Other EC': 8.00,
      'Parivartan EC': 8.00,
    },
  },
  {
    min: 1.650,
    max: 1.700,
    label: '1.651 to 1.700',
    rates: {
      'Other Basic EC': 7.00,
      'Parivartan Basic EC': 7.00,
      'Other Semi EC': 7.00,
      'Parivartan Semi EC': 7.00,
      'Other EC': 7.00,
      'Parivartan EC': 7.00,
    },
  },
  {
    min: 1.700,
    max: 1.750,
    label: '1.701 to 1.750',
    rates: {
      'Other Basic EC': 6.00,
      'Parivartan Basic EC': 6.00,
      'Other Semi EC': 6.00,
      'Parivartan Semi EC': 6.00,
      'Other EC': 6.00,
      'Parivartan EC': 6.00,
    },
  },
  {
    min: 1.750,
    max: 1.800,
    label: '1.751 to 1.800',
    rates: {
      'Other Basic EC': 5.00,
      'Parivartan Basic EC': 5.00,
      'Other Semi EC': 5.00,
      'Parivartan Semi EC': 5.00,
      'Other EC': 5.00,
      'Parivartan EC': 5.00,
    },
  },
  {
    min: 1.800,
    max: Infinity,
    label: '1.801 and above',
    rates: {
      'Other Basic EC': 0.00,
      'Parivartan Basic EC': 0.00,
      'Other Semi EC': 0.00,
      'Parivartan Semi EC': 0.00,
      'Other EC': 0.00,
      'Parivartan EC': 0.00,
    },
  },
];

/**
 * Pure calculation function for IB Group GC Policy
 *
 * @param {Object} batchData
 * @param {number} batchData.chicksHoused - Number of chicks placed
 * @param {number} batchData.totalDeaths - Total bird deaths
 * @param {number} batchData.birdsLifted - Number of birds lifted
 * @param {number} batchData.totalLiftedWeight - Total live weight of lifted birds in KG
 * @param {number} batchData.actualFcr - Actual batch FCR
 * @param {string} batchData.shedCategory - One of the 6 EC shed categories
 *
 * @returns {Object} Comprehensive calculation result with breakdown
 */
export function calculateIBGC(batchData = {}) {
  const chicksHoused = Number(batchData.chicksHoused || batchData.initialBirdCount || batchData.chicksReceived || 0);
  const totalDeaths = Number(batchData.totalDeaths >= 0 ? batchData.totalDeaths : (batchData.deaths || 0));
  const birdsLifted = Number(batchData.birdsLifted || 0);
  const totalLiftedWeight = Number(batchData.totalLiftedWeight || batchData.totalLiveWeight || 0);
  const actualFcr = Number(batchData.actualFcr || batchData.finalFcr || batchData.fcr || 0);
  const shedCategory = (batchData.shedCategory || 'Parivartan EC').trim();

  // Validate complete data
  if (
    !chicksHoused || chicksHoused <= 0 ||
    !birdsLifted || birdsLifted <= 0 ||
    !totalLiftedWeight || totalLiftedWeight <= 0 ||
    !actualFcr || actualFcr <= 0 ||
    !SHED_CATEGORIES.includes(shedCategory)
  ) {
    return {
      isValid: false,
      message: 'GC calculation requires complete batch data.',
      requiredFields: {
        chicksHoused: chicksHoused > 0,
        birdsLifted: birdsLifted > 0,
        totalLiftedWeight: totalLiftedWeight > 0,
        actualFcr: actualFcr > 0,
        shedCategoryValid: SHED_CATEGORIES.includes(shedCategory),
      },
      gcPolicyVersion: GC_POLICY_VERSION,
    };
  }

  // 1. Mortality Percentage (M%)
  // M% = (Total Deaths / Chicks Housed) * 100
  const mortalityPercentage = (totalDeaths / chicksHoused) * 100;

  // 2. Corrected Body Weight (CBW)
  // RULE 1: If M% <= 5% -> CBW = Total Lifted Weight / Lifted Birds
  // RULE 2: If M% > 5%  -> CBW = Total Lifted Weight / (Chicks Housed * 0.95)
  let cbw = 0;
  let cbwMethod = '';
  let cbwDenominator = 0;
  let cbwFormulaDescription = '';

  if (mortalityPercentage <= 5) {
    cbwMethod = 'RULE_1_MORTALITY_LE_5';
    cbwDenominator = birdsLifted;
    cbw = totalLiftedWeight / birdsLifted;
    cbwFormulaDescription = 'Total Lifted Weight / Lifted Birds (M% <= 5%)';
  } else {
    cbwMethod = 'RULE_2_MORTALITY_GT_5';
    cbwDenominator = chicksHoused * 0.95;
    cbw = totalLiftedWeight / (chicksHoused * 0.95);
    cbwFormulaDescription = 'Total Lifted Weight / (Chicks Housed * 0.95) (M% > 5%)';
  }

  // 3. Corrected FCR (cFCR)
  // cFCR = (2 - CBW) * 0.25 + FCR
  const correctedFcr = (2 - cbw) * 0.25 + actualFcr;

  // 4. GC Payout Slab Lookup based on cFCR and Shed Category
  let matchedSlab = GC_SLABS[GC_SLABS.length - 1]; // default to zero slab
  for (const slab of GC_SLABS) {
    if (correctedFcr <= slab.max) {
      matchedSlab = slab;
      break;
    }
  }

  const gcRatePerKg = matchedSlab.rates[shedCategory] !== undefined
    ? matchedSlab.rates[shedCategory]
    : 0;

  // 5. Estimated GC Payout
  // Estimated GC = Total Lifted Weight * GC Rate per KG
  const estimatedGc = totalLiftedWeight * gcRatePerKg;

  return {
    isValid: true,
    gcPolicyVersion: GC_POLICY_VERSION,
    shedCategory,
    chicksHoused,
    totalDeaths,
    birdsLifted,
    totalLiftedWeight: Number(totalLiftedWeight.toFixed(2)),
    actualFcr: Number(actualFcr.toFixed(3)),
    mortalityPercentage: Number(mortalityPercentage.toFixed(2)),
    cbw: Number(cbw.toFixed(4)),
    cbwDisplay: Number(cbw.toFixed(2)),
    cbwMethod,
    cbwDenominator: Number(cbwDenominator.toFixed(1)),
    cbwFormulaDescription,
    correctedFcr: Number(correctedFcr.toFixed(4)),
    correctedFcrDisplay: Number(correctedFcr.toFixed(2)),
    slabDescription: matchedSlab.label,
    gcRatePerKg: Number(gcRatePerKg.toFixed(2)),
    estimatedGc: Number(estimatedGc.toFixed(2)),
    breakdown: {
      mortality: {
        formula: '(Total Deaths / Chicks Housed) * 100',
        expression: `(${totalDeaths} / ${chicksHoused}) * 100`,
        result: `${mortalityPercentage.toFixed(2)}%`,
      },
      cbw: {
        rule: mortalityPercentage <= 5 ? 'Rule 1 (M% <= 5%)' : 'Rule 2 (M% > 5%)',
        formula: cbwFormulaDescription,
        expression: `${totalLiftedWeight.toFixed(1)} / ${cbwDenominator.toFixed(1)}`,
        result: `${cbw.toFixed(4)} KG`,
      },
      correctedFcr: {
        formula: '(2 - CBW) * 0.25 + Actual FCR',
        expression: `(2 - ${cbw.toFixed(4)}) * 0.25 + ${actualFcr.toFixed(3)}`,
        result: correctedFcr.toFixed(4),
      },
      slab: {
        slabRange: matchedSlab.label,
        category: shedCategory,
        rate: `Rs ${gcRatePerKg.toFixed(2)} / KG`,
      },
      payout: {
        formula: 'Total Lifted Weight * GC Rate per KG',
        expression: `${totalLiftedWeight.toFixed(1)} KG * Rs ${gcRatePerKg.toFixed(2)}`,
        result: `Rs ${estimatedGc.toLocaleString()}`,
      },
    },
  };
}
