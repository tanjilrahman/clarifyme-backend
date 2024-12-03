export const subscriptions = {
  plans: [
    {
      id: 1,
      name: "Small",
      price: 20,
      accessLimit: 15,
      priceId: process.env.STRIPE_SMALL_PRICEID,
      features: ["Real time transcribing", "Template Integration", "Automated Interviews and Screenings"],
      description: "For 15 users who want to use our basic features",
    },
    {
      id: 2,
      name: "Medium",
      price: 50,
      accessLimit: 30,
      priceId: process.env.STRIPE_MEDIUM_PRICEID,
      features: ["Includes Small", "Custom Templates", "Custom questions", "Automated booking system"],
      description: "For 30 users looking to cut admin tasks and scale.",
    },
    {
      id: 3,
      name: "Enterprise",
      price: 80,
      accessLimit: 50,
      priceId: process.env.STRIPE_ENTERPRISE_PRICEID,
      features: [
        "Includes Small",
        "Custom Templates",
        "Custom questions",
        "Automated booking system",
        "Future updates",
      ],
      description: "For 50 users seeking higher output and automation.",
    },
  ],
};
