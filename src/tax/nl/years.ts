import type { TaxYearParameters } from '@/domain/types';

/**
 * Dutch tax parameters per year.
 *
 * IMPORTANT — READ THIS BEFORE YOU FILE ANYTHING.
 *
 * These figures are pre-filled from public sources so the app is useful out of
 * the box. They are NOT verified and rates change every year (sometimes
 * retroactively). Every value here is editable in Settings → Tax years, and the
 * app shows an "unverified" banner on every calculation until you tick the
 * "I checked these against belastingdienst.nl" box for that year.
 *
 * Treat the output as a well-organised estimate, not as an aangifte.
 */

const EUR = (amount: number): number => Math.round(amount * 100);

const YEAR_2024: TaxYearParameters = {
	year: 2024,
	box1Brackets: [
		{ upToCents: EUR(75_518), ratePercent: 36.97 },
		{ upToCents: null, ratePercent: 49.5 },
	],
	box1BracketsAow: [
		{ upToCents: EUR(38_098), ratePercent: 19.07 },
		{ upToCents: EUR(75_518), ratePercent: 36.97 },
		{ upToCents: null, ratePercent: 49.5 },
	],
	zelfstandigenaftrekCents: EUR(3_750),
	startersaftrekCents: EUR(2_123),
	hoursCriterion: 1225,
	mkbProfitExemptionPercent: 13.31,
	kiaThresholdCents: EUR(2_800),
	kiaCeilingCents: EUR(69_765),
	kiaRatePercent: 28,
	mileageAllowanceCentsPerKm: 23,
	capitalisationThresholdCents: EUR(450),
	maxDepreciationPercent: 20,
	mixedCostsFlatAddbackCents: EUR(5_600),
	mixedCostsDeductiblePercent: 80,
	generalTaxCredit: [
		{ fromCents: 0, baseCents: EUR(3_362), ratePercent: 0 },
		{ fromCents: EUR(24_813), baseCents: EUR(3_362), ratePercent: -6.63 },
		{ fromCents: EUR(75_518), baseCents: 0, ratePercent: 0 },
	],
	labourTaxCredit: [
		{ fromCents: 0, baseCents: 0, ratePercent: 8.425 },
		{ fromCents: EUR(11_490), baseCents: EUR(968), ratePercent: 31.433 },
		{ fromCents: EUR(24_820), baseCents: EUR(5_158), ratePercent: 2.471 },
		{ fromCents: EUR(39_957), baseCents: EUR(5_532), ratePercent: -6.51 },
		{ fromCents: EUR(124_935), baseCents: 0, ratePercent: 0 },
	],
	zvwRatePercent: 5.32,
	zvwMaxIncomeCents: EUR(71_628),
	korTurnoverCeilingCents: EUR(20_000),
	vatRates: [21, 9, 0],
	verifiedByUser: false,
	sourceNote:
		'Pre-filled from public 2024 figures. Verify at belastingdienst.nl.',
};

const YEAR_2025: TaxYearParameters = {
	year: 2025,
	box1Brackets: [
		{ upToCents: EUR(38_441), ratePercent: 35.82 },
		{ upToCents: EUR(76_817), ratePercent: 37.48 },
		{ upToCents: null, ratePercent: 49.5 },
	],
	box1BracketsAow: [
		{ upToCents: EUR(38_441), ratePercent: 17.92 },
		{ upToCents: EUR(76_817), ratePercent: 37.48 },
		{ upToCents: null, ratePercent: 49.5 },
	],
	zelfstandigenaftrekCents: EUR(2_470),
	startersaftrekCents: EUR(2_123),
	hoursCriterion: 1225,
	mkbProfitExemptionPercent: 12.7,
	kiaThresholdCents: EUR(2_901),
	kiaCeilingCents: EUR(70_602),
	kiaRatePercent: 28,
	mileageAllowanceCentsPerKm: 23,
	capitalisationThresholdCents: EUR(450),
	maxDepreciationPercent: 20,
	mixedCostsFlatAddbackCents: EUR(5_700),
	mixedCostsDeductiblePercent: 80,
	generalTaxCredit: [
		{ fromCents: 0, baseCents: EUR(3_068), ratePercent: 0 },
		{ fromCents: EUR(28_406), baseCents: EUR(3_068), ratePercent: -6.337 },
		{ fromCents: EUR(76_817), baseCents: 0, ratePercent: 0 },
	],
	labourTaxCredit: [
		{ fromCents: 0, baseCents: 0, ratePercent: 8.053 },
		{ fromCents: EUR(12_169), baseCents: EUR(980), ratePercent: 30.03 },
		{ fromCents: EUR(26_288), baseCents: EUR(5_220), ratePercent: 2.258 },
		{ fromCents: EUR(43_071), baseCents: EUR(5_599), ratePercent: -6.51 },
		{ fromCents: EUR(129_078), baseCents: 0, ratePercent: 0 },
	],
	zvwRatePercent: 5.26,
	zvwMaxIncomeCents: EUR(75_864),
	korTurnoverCeilingCents: EUR(20_000),
	vatRates: [21, 9, 0],
	verifiedByUser: false,
	sourceNote:
		'Pre-filled from public 2025 figures. Verify at belastingdienst.nl.',
};

/**
 * 2026 is the least reliable entry here: the deduction phase-out schedule is
 * known, but brackets and credits are indexed annually. Everything below is a
 * projection. Open Settings → Tax years and correct it before you rely on it.
 */
const YEAR_2026: TaxYearParameters = {
	...YEAR_2025,
	year: 2026,
	zelfstandigenaftrekCents: EUR(1_200),
	verifiedByUser: false,
	sourceNote:
		'PROJECTION. Only the zelfstandigenaftrek phase-out is scheduled; brackets, ' +
		'credits and thresholds are copied from 2025 and are almost certainly wrong. ' +
		'Correct them in Settings → Tax years before filing.',
};

const BUILT_IN: Record<number, TaxYearParameters> = {
	2024: YEAR_2024,
	2025: YEAR_2025,
	2026: YEAR_2026,
};

export const AVAILABLE_TAX_YEARS = Object.keys(BUILT_IN)
	.map(Number)
	.sort((a, b) => a - b);

export const LATEST_BUILT_IN_YEAR =
	AVAILABLE_TAX_YEARS[AVAILABLE_TAX_YEARS.length - 1] ?? 2025;

/**
 * Resolve the parameters for a year, applying any user overrides. Years beyond
 * the built-in table fall back to the latest known year, carried forward.
 */
export function taxYearParameters(
	year: number,
	overrides: Record<number, Partial<TaxYearParameters>> = {},
): TaxYearParameters {
	const base =
		BUILT_IN[year] ??
		({
			...(BUILT_IN[LATEST_BUILT_IN_YEAR] as TaxYearParameters),
			year,
			verifiedByUser: false,
			sourceNote: `No built-in figures for ${year}; carried forward from ${LATEST_BUILT_IN_YEAR}. Edit them in Settings → Tax years.`,
		} as TaxYearParameters);

	const override = overrides[year];
	if (!override) return base;
	return { ...base, ...override, year };
}

export function isYearVerified(
	year: number,
	overrides: Record<number, Partial<TaxYearParameters>> = {},
): boolean {
	return taxYearParameters(year, overrides).verifiedByUser === true;
}
