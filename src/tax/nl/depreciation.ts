import { multiply, percentOf, roundCents, type Cents } from '@/core/money';
import { yearOf } from '@/core/dates';
import type { Asset, TaxYearParameters } from '@/domain/types';

/**
 * Straight-line depreciation, Dutch style: the annual charge may not exceed 20%
 * of (cost − residual value), which is the same as saying nothing may be written
 * off in under five years. The first and last years are pro-rated by month.
 */

export interface DepreciationYear {
	year: number;
	/** Months the asset was held in that year. */
	months: number;
	chargeCents: Cents;
	openingBookValueCents: Cents;
	closingBookValueCents: Cents;
}

export function annualDepreciationBase(asset: Asset): Cents {
	return Math.max(0, asset.purchasePriceCents - asset.residualValueCents);
}

export function depreciationSchedule(
	asset: Asset,
	params: TaxYearParameters,
): DepreciationYear[] {
	const base = annualDepreciationBase(asset);
	if (base <= 0) return [];

	const requestedRate = 100 / Math.max(1, asset.usefulLifeYears);
	const rate = Math.min(requestedRate, params.maxDepreciationPercent);
	const fullYearCharge = percentOf(base, rate);
	if (fullYearCharge <= 0) return [];

	const startYear = yearOf(asset.purchaseDate);
	const startMonth = Number(asset.purchaseDate.slice(5, 7));
	const disposalYear = asset.disposedOn ? yearOf(asset.disposedOn) : null;
	const disposalMonth = asset.disposedOn
		? Number(asset.disposedOn.slice(5, 7))
		: null;

	const schedule: DepreciationYear[] = [];
	let accumulated = 0;
	let year = startYear;

	// Hard stop well past any realistic life, so a bad usefulLife cannot hang the UI.
	const maxYears = 60;

	for (let step = 0; step < maxYears; step += 1) {
		if (accumulated >= base) break;
		if (disposalYear !== null && year > disposalYear) break;

		let months = 12;
		if (year === startYear) months = 13 - startMonth;
		if (disposalYear !== null && year === disposalYear) {
			months = Math.min(months, disposalMonth ?? 12);
		}

		const uncapped = roundCents((fullYearCharge * months) / 12);
		const charge = Math.min(uncapped, base - accumulated);

		const opening = asset.purchasePriceCents - accumulated;
		accumulated += charge;

		schedule.push({
			year,
			months,
			chargeCents: charge,
			openingBookValueCents: opening,
			closingBookValueCents: asset.purchasePriceCents - accumulated,
		});

		year += 1;
	}

	return schedule;
}

/** Depreciation charged against a single year's profit, business share applied. */
export function depreciationForYear(
	asset: Asset,
	year: number,
	params: TaxYearParameters,
): Cents {
	const entry = depreciationSchedule(asset, params).find(
		(row) => row.year === year,
	);
	if (!entry) return 0;
	return multiply(entry.chargeCents, asset.businessUsePercent / 100);
}

export function totalDepreciationForYear(
	assets: Asset[],
	year: number,
	params: TaxYearParameters,
): Cents {
	return assets.reduce(
		(sum, asset) => sum + depreciationForYear(asset, year, params),
		0,
	);
}

export function bookValueAtEndOf(
	asset: Asset,
	year: number,
	params: TaxYearParameters,
): Cents {
	const schedule = depreciationSchedule(asset, params);
	const upTo = schedule.filter((row) => row.year <= year);
	const last = upTo[upTo.length - 1];
	if (!last) return asset.purchasePriceCents;
	return last.closingBookValueCents;
}

// ---------------------------------------------------------------------------
// Investment allowance (kleinschaligheidsinvesteringsaftrek — KIA)
// ---------------------------------------------------------------------------

export interface KiaResult {
	qualifyingInvestmentCents: Cents;
	allowanceCents: Cents;
	applies: boolean;
	explanation: string;
}

/**
 * Simplified KIA: a flat percentage in the main band. The real schedule has a
 * plateau and a taper above the ceiling; this covers the band nearly every sole
 * trader falls into and says so when it does not.
 */
export function computeKia(
	assets: Asset[],
	year: number,
	params: TaxYearParameters,
): KiaResult {
	const qualifying = assets
		.filter(
			(asset) =>
				asset.qualifiesForKia &&
				yearOf(asset.purchaseDate) === year &&
				asset.purchasePriceCents >= params.capitalisationThresholdCents,
		)
		.reduce(
			(sum, asset) =>
				sum +
				multiply(
					asset.purchasePriceCents,
					asset.businessUsePercent / 100,
				),
			0,
		);

	if (qualifying <= params.kiaThresholdCents) {
		return {
			qualifyingInvestmentCents: qualifying,
			allowanceCents: 0,
			applies: false,
			explanation: `Total qualifying investment is below the threshold for ${year}, so no investment allowance applies.`,
		};
	}

	if (qualifying > params.kiaCeilingCents) {
		return {
			qualifyingInvestmentCents: qualifying,
			allowanceCents: percentOf(
				params.kiaCeilingCents,
				params.kiaRatePercent,
			),
			applies: true,
			explanation:
				'Your investment exceeds the band this app models. Above the ceiling the allowance ' +
				'plateaus and then tapers — check the exact figure with the Belastingdienst before filing.',
		};
	}

	return {
		qualifyingInvestmentCents: qualifying,
		allowanceCents: percentOf(qualifying, params.kiaRatePercent),
		applies: true,
		explanation: `${params.kiaRatePercent}% of qualifying investments made in ${year}.`,
	};
}
