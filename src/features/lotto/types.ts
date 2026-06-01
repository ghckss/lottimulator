export type LottoNumber = number;

export type LottoDraw = {
  round: number;
  date: string;
  numbers: LottoNumber[];
  bonus: LottoNumber;
};

export type RecommendationBasis = {
  round: number;
  drawDate: string;
  seed: string;
};

export type LottoNumberSet = {
  drawOrder: LottoNumber[];
  sortedNumbers: LottoNumber[];
};

export type WeeklyRecommendationGroup = LottoNumberSet & {
  id: number;
  label: string;
  multiplier: number;
  offset: number;
};

export type WeeklyRecommendation = {
  basis: RecommendationBasis;
  condition: string;
  groups: WeeklyRecommendationGroup[];
};
