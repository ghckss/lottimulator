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

export type RecommendationMethodKey = "weighted" | "pattern" | "markov";

export type DataRecommendationBasis = {
  round: number;
  drawDate: string;
  sourceLatestRound: number;
  totalDraws: number;
  generatedAt: string;
};

export type ScoredNumber = {
  number: LottoNumber;
  score: number;
};

export type RecommendationCombo = LottoNumberSet & {
  id: number;
  label: string;
};

export type MethodRecommendation = {
  key: RecommendationMethodKey;
  label: string;
  description: string;
  condition: string;
  scores: ScoredNumber[];
  groups: RecommendationCombo[];
};

export type DataRecommendation = {
  basis: DataRecommendationBasis;
  methods: MethodRecommendation[];
};
