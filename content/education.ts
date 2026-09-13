import type { Education } from "./schemas";

/** Education - spawns on the UQ Campus zone. */
export const education: Education[] = [
  {
    id: "uq-software-engineering",
    institution: "University of Queensland",
    degree: "Bachelor of Engineering (Honours): Computer Engineering",
    location: "Brisbane, QLD",
    start: "2025",
    end: null,
    highlights: [
      "Developing expertise in software development, including Python, Java, and C++.",
      "Hands-on experience in web and app development across front-end and back-end technologies.",
      "Awarded a 25% scholarship every semester for maintaining high academic performance.",
    ],
    world: {
      zone: "campus",
      sprite: "campus",
      dialog: [
        "The University of Queensland - my home campus.",
        "Computer Engineering, with a 25% scholarship renewed every semester.",
      ],
    },
  },
];
