import { type ClientSchema, a } from '@aws-amplify/data-schema';

/**
 * Client-side schema typing for Amplify Data. Keep in sync with
 * `apmilify-finance-tracker/amplify/data/resource.ts`.
 */
const schema = a.schema({
  Transaction: a
    .model({
      type: a.string().required(),
      amount: a.float().required(),
      category: a.string().required(),
      note: a.string(),
      date: a.date().required(),
    })
    .authorization((allow) => [allow.owner()]),

  Budget: a
    .model({
      monthlyIncome: a.float(),
      monthlyBudget: a.float(),
      savingsTarget: a.float(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;
