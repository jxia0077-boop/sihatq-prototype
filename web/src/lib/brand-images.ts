export type BrandImage = {
  src: string;
  alt: string;
};

export const brandImages = {
  heroClinician: {
    src: "/images/brand/hero-clinician.jpg",
    alt: "A smiling Malaysian healthcare professional in a bright clinic wearing a white coat and teal stethoscope.",
  },
  clinicInterior: {
    src: "/images/brand/clinic-interior.jpg",
    alt: "A peaceful modern Malaysian clinic interior with sunlight, tropical plants, warm wood, and teal accents.",
  },
  privacyDashboard: {
    src: "/images/brand/privacy-dashboard.jpg",
    alt: "A clean privacy dashboard visualization with security shields and data controls in teal and white tones.",
  },
  parkWalk: {
    src: "/images/brand/park-walk.jpg",
    alt: "Malaysian adults walking briskly in a lush green urban park at sunrise.",
  },
  lifestyleActions: {
    src: "/images/brand/lifestyle-actions.jpg",
    alt: "A serene teal healthcare illustration with lifestyle symbols including a heart pulse, water drop, and sneaker.",
  },
  nursePortrait: {
    src: "/images/brand/nurse-portrait.jpg",
    alt: "A Malaysian nurse smiling warmly in a modern clinic with soft natural light.",
  },
  consultantPortrait: {
    src: "/images/brand/consultant-portrait.jpg",
    alt: "A Malaysian healthcare consultant smiling warmly in a softly lit clinical setting.",
  },
} satisfies Record<string, BrandImage>;
