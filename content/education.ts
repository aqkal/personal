import type { Education } from "./schemas";

/** Education — spawns on the UQ Campus zone. */
export const education: Education[] = [
  {
    id: "uq-software-engineering",
    institution: "University of Queensland",
    degree: "Bachelor of Engineering (Honours): Software Engineering",
    location: "Brisbane, QLD",
    start: "2023-02",
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
        "The University of Queensland — my home campus.",
        "Software Engineering, with a 25% scholarship renewed every semester.",
      ],
    },
  },
];
