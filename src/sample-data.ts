// Simulated API response
const apiResponse = {
  "Product Name": "Twin Ion Engine",
  // "Lot No.": "L",
  "Lot No.": "LP888",
  "Product Date": "2017-05-04",
  "Control No.": 1,
  "Reference ID.": "9784908588457",
  Section: "GE",
  "Product Code": "TIE-LN",
};

// Template-dependent fixed values added by the application layer
const templateFixedValues = {
  "Product Category Code": "TIE",
};

export const sampleData = {
  ...apiResponse,
  ...templateFixedValues,
};
