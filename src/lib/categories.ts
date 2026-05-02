/**
 * Service categories. Bilingual (English + Hindi). Stable slugs used as DB keys.
 */
export type Category = {
  slug: string;
  nameEn: string;
  nameHi: string;
  icon: string; // lucide icon name
  ondcCode: string; // ONDC service taxonomy mapping (RET11/Services)
};

export const CATEGORIES: Category[] = [
  { slug: "electrician", nameEn: "Electrician", nameHi: "इलेक्ट्रीशियन", icon: "Zap", ondcCode: "SRV-ELEC" },
  { slug: "plumber", nameEn: "Plumber", nameHi: "प्लंबर", icon: "Wrench", ondcCode: "SRV-PLMB" },
  { slug: "carpenter", nameEn: "Carpenter", nameHi: "बढ़ई", icon: "Hammer", ondcCode: "SRV-CARP" },
  { slug: "painter", nameEn: "Painter", nameHi: "पेंटर", icon: "PaintRoller", ondcCode: "SRV-PNTR" },
  { slug: "ac-repair", nameEn: "AC Repair", nameHi: "एसी मरम्मत", icon: "Snowflake", ondcCode: "SRV-ACRP" },
  { slug: "appliance-repair", nameEn: "Appliance Repair", nameHi: "उपकरण मरम्मत", icon: "Refrigerator", ondcCode: "SRV-APRR" },
  { slug: "cleaning", nameEn: "Home Cleaning", nameHi: "घर की सफाई", icon: "Sparkles", ondcCode: "SRV-CLNG" },
  { slug: "pest-control", nameEn: "Pest Control", nameHi: "कीट नियंत्रण", icon: "Bug", ondcCode: "SRV-PSTC" },
  { slug: "tutor", nameEn: "Tutor", nameHi: "शिक्षक", icon: "GraduationCap", ondcCode: "SRV-TUTR" },
  { slug: "yoga-fitness", nameEn: "Yoga & Fitness", nameHi: "योग और फिटनेस", icon: "Dumbbell", ondcCode: "SRV-YGFT" },
  { slug: "salon-beauty", nameEn: "Salon & Beauty", nameHi: "सैलून और सौंदर्य", icon: "Scissors", ondcCode: "SRV-SLBT" },
  { slug: "labour", nameEn: "General Labour", nameHi: "मजदूर", icon: "HardHat", ondcCode: "SRV-LBOR" },
  { slug: "driver", nameEn: "Driver", nameHi: "ड्राइवर", icon: "Car", ondcCode: "SRV-DRVR" },
  { slug: "cook", nameEn: "Cook", nameHi: "रसोइया", icon: "ChefHat", ondcCode: "SRV-COOK" },
  { slug: "elder-care", nameEn: "Elder Care", nameHi: "बुजुर्ग देखभाल", icon: "HeartHandshake", ondcCode: "SRV-ELDR" },
  { slug: "babysitter", nameEn: "Babysitter", nameHi: "बेबीसिटर", icon: "Baby", ondcCode: "SRV-BBSR" },
  { slug: "tailor", nameEn: "Tailor", nameHi: "दर्जी", icon: "Shirt", ondcCode: "SRV-TLR" },
  { slug: "mechanic", nameEn: "Mechanic", nameHi: "मैकेनिक", icon: "Cog", ondcCode: "SRV-MECH" },
  { slug: "gardener", nameEn: "Gardener", nameHi: "माली", icon: "Leaf", ondcCode: "SRV-GRDN" },
  { slug: "photographer", nameEn: "Photographer", nameHi: "फोटोग्राफर", icon: "Camera", ondcCode: "SRV-PHTO" },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): Category | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}
