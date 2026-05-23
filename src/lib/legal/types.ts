export type LegalSection = {
  id?: string;
  title: string;
  paragraphs: string[];
};

export type TermsDocument = {
  version: string;
  title: string;
  sections: LegalSection[];
};

export type PrivacyDocument = {
  version: string;
  title: string;
  paragraphs: string[];
};

export type LegalBundle = {
  terms: TermsDocument;
  privacy: PrivacyDocument;
};
