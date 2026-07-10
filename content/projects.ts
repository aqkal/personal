import type { Project } from "./schemas";

/**
 * Projects - one entry = one glowing arcade cabinet in the Project Arcade
 * + one card on /projects + one section on /resume.
 * Order controls cabinet placement (first = closest to the arcade entrance).
 * See docs/ADDING_CONTENT.md to add an entry.
 */
export const projects: Project[] = [
  {
    id: "hull-ship-inspector",
    name: "Hull Ship Inspector",
    tagline: "Computer vision that inspects ship hulls from ROV footage",
    context: "University of Queensland - DECO3801",
    year: 2026,
    description:
      "A web-based vessel hull inspection platform where users upload Remotely Operated Vehicle (ROV) footage for automated marine fouling assessment, powered by computer vision and machine learning.",
    highlights: [
      "Implemented computer vision and machine learning techniques in Python and OpenCV to analyse underwater video and identify hull fouling patterns.",
      "Designed image and video processing pipelines to extract visual features and support automated inspection workflows.",
      "Collaborated within a multidisciplinary team to build the frontend, backend, and computer vision components.",
      "Conducted testing, validation, and optimisation of analysis models to improve inspection accuracy and usability.",
    ],
    tech: ["Python", "OpenCV", "Machine Learning", "TypeScript", "HTML", "CSS"],
    featured: true,
    caseStudy: {
      problem:
        "Marine fouling on ship hulls increases drag and fuel consumption, and inspecting for it means specialists manually reviewing hours of murky underwater ROV footage. Slow, expensive, and easy to miss things.",
      approach:
        "We built a web platform where inspectors upload ROV footage and a Python + OpenCV pipeline takes over: frames are extracted, visual features isolated, and machine learning models classify fouling patterns. I worked across the computer vision pipeline and the web frontend and backend within a multidisciplinary team.",
      outcome:
        "An automated inspection workflow that turns raw footage into an assessment, validated and tuned for accuracy and usability. It also taught me how to ship ML work as a usable product rather than a notebook.",
    },
    world: {
      zone: "arcade",
      sprite: "cabinet",
      dialog: [
        "HULL INSPECTOR - insert coin to dive.",
        "An ROV plunges below the waterline and AI spots the fouling on ship hulls.",
      ],
    },
  },
  {
    id: "microservices-architecture",
    name: "Microservices Platform",
    tagline: "Cloud-deployed microservices built by a 7-developer team",
    context: "University of Queensland - CSSE6400 Software Architecture",
    year: 2026,
    description:
      "A microservices-based application designed and built as part of a 7-developer team, applying modern software architecture principles with infrastructure as code.",
    highlights: [
      "Developed Java backend services exposing RESTful APIs across independently deployable service components.",
      "Containerised services using Docker and orchestrated multi-service environments with Docker Compose.",
      "Provisioned and deployed cloud infrastructure as code using Terraform for repeatable, automated deployments.",
      "Applied mutation testing to evaluate test-suite effectiveness and strengthen overall code quality.",
    ],
    tech: ["Java", "Docker", "Terraform", "REST APIs"],
    featured: true,
    caseStudy: {
      problem:
        "Seven developers building one system in parallel is where architectures go to die: shared state, tangled deploys, and a test suite nobody trusts.",
      approach:
        "We split the system into independently deployable Java services behind RESTful APIs, containerised everything with Docker and Compose, and defined the cloud infrastructure as Terraform code so every environment was reproducible from a fresh checkout. Mutation testing kept the test suite honest about what it actually caught.",
      outcome:
        "Repeatable one-command deployments, services that shipped independently without stepping on each other, and a measurably stronger test suite. The clearest lesson I have had in why architecture decisions are team decisions.",
    },
    world: {
      zone: "arcade",
      sprite: "cabinet",
      dialog: [
        "MICROSERVICE TYCOON - scale to level 7!",
        "Java services, Docker containers, and Terraform-provisioned cloud infra.",
      ],
    },
  },
  {
    id: "rentixe",
    name: "Rentixe",
    tagline: "Full-stack apartment rental platform",
    context: "Personal project",
    year: 2025,
    description:
      "A full-stack web platform for searching and listing apartments for rent, built with Next.js and Supabase and deployed through a CI/CD pipeline to Vercel.",
    highlights: [
      "Developed the application in TypeScript using the Next.js framework with a component-based architecture.",
      "Implemented backend services with Supabase for authentication, database management, and API interactions.",
      "Designed responsive frontend interfaces for property listings, filtering, and user interactions.",
      "Deployed via a GitHub Actions CI/CD workflow and hosted on Vercel for fast, scalable cloud delivery.",
    ],
    tech: ["Next.js", "TypeScript", "Supabase", "Vercel", "GitHub Actions"],
    featured: true,
    caseStudy: {
      problem:
        "Finding a rental means juggling listings, filters, and contact threads across half the internet. I wanted one clean platform for searching and listing apartments, and I wanted to own every layer of it myself.",
      approach:
        "Next.js and TypeScript with a component-based architecture on the front, Supabase for authentication, database, and APIs on the back. Responsive listing, filtering, and detail interfaces, wired into a GitHub Actions CI/CD pipeline that deploys to Vercel on every push.",
      outcome:
        "A production full-stack platform delivered end to end by one person, and the project that made this very portfolio's stack feel like home.",
    },
    world: {
      zone: "arcade",
      sprite: "cabinet",
      dialog: [
        "RENTIXE - find your player home base.",
        "Next.js + Supabase, the same stack powering the site you're standing in.",
      ],
    },
  },
  {
    id: "team-game-project",
    name: "Team Game Project",
    tagline: "Extending a shared Java game engine with 20+ developers",
    context: "University of Queensland - CSSE3200 Software Engineering Studio",
    year: 2025,
    description:
      "Collaborated in a large team of 20+ developers to extend a shared Java game-engine codebase, applying real-world software engineering practices for managing complex, evolving systems.",
    highlights: [
      "Implemented object-oriented game mechanics, system logic, and UI components following established design patterns.",
      "Used Git and a continuous integration pipeline to coordinate development and merge work safely across multiple teams.",
      "Applied test-driven development, unit testing, and code coverage analysis to maintain quality and prevent regressions.",
      "Participated in code review, refactoring, and integration of features into the common code base.",
    ],
    tech: ["Java", "Git", "JUnit", "Continuous Integration"],
    featured: false,
    caseStudy: {
      problem:
        "More than twenty developers extending one shared Java game engine at the same time. Without discipline, that is merge-conflict soup and broken builds every morning.",
      approach:
        "Established design patterns for new mechanics and UI systems, test-driven development with JUnit and coverage analysis, and a Git workflow with continuous integration so work merged safely across sub-teams. Code review was the culture, not a checkbox.",
      outcome:
        "Features landed in the common codebase without regressions, and I got the closest thing university offers to real industry engineering: shipping inside a large, live team.",
    },
    world: {
      zone: "arcade",
      sprite: "cabinet",
      dialog: [
        "STUDIO WARS - 20 devs, one codebase.",
        "A crash course in merge conflicts, code review, and shipping together.",
      ],
    },
  },
  {
    id: "digital-health-fhir",
    name: "Digital Health Platform",
    tagline: "Interoperable healthcare data with the FHIR standard",
    context: "University of Queensland - COMP3820",
    year: 2025,
    description:
      "A digital health web platform using the FHIR (Fast Healthcare Interoperability Resources) standard for interoperable healthcare data exchange, modelled on modern clinical systems.",
    highlights: [
      "Implemented web interfaces and backend integrations to retrieve and display electronic health record data through RESTful APIs.",
      "Collaborated in a team to design scalable healthcare software solutions modelled on modern clinical systems.",
    ],
    tech: ["FHIR", "REST APIs", "JavaScript"],
    featured: false,
    caseStudy: {
      problem:
        "Healthcare data lives in silos, and patients pay for it: records that cannot follow them between systems mean repeated tests and missed context.",
      approach:
        "We built a digital health platform on the FHIR standard, the shared language of modern clinical systems: web interfaces and backend integrations that retrieve and display electronic health records through standards-compliant REST APIs, designed as a team against real clinical-system patterns.",
      outcome:
        "A working interoperable platform and a practical grounding in the standard that runs modern health tech, from resources and profiles to the realities of clinical data.",
    },
    world: {
      zone: "arcade",
      sprite: "cabinet",
      dialog: [
        "HEALTH HERO - interoperability is the final boss.",
        "Electronic health records flowing through FHIR-standard APIs.",
      ],
    },
  },
];
