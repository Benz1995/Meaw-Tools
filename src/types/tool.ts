export type ToolCategory =
  | "data"
  | "encoding"
  | "security"
  | "text"
  | "date-time"
  | "developer"
  | "productivity"
  | "business"
  | "calculator"
  | "media";

export type ToolCategoryConfig = {
  value: ToolCategory;
  label: string;
  description: string;
  icon: string;
};

export type ToolConfig = {
  slug: string;
  name: string;
  thaiName: string;
  shortDescription: string;
  description: string;
  category: ToolCategory;
  icon: string;
  keywords: string[];
  isPopular: boolean;
  isNew: boolean;
  relatedTools: string[];
  howTo: string[];
  example: string;
  caution: string;
  faq: Array<{ question: string; answer: string }>;
};
