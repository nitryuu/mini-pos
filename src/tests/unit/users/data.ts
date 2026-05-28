import dayjs from "dayjs";

export const data = [
  {
    id: 1,
    name: "John",
    email: "john@email.com",
    role: "cashier",
    password: "john",
    createdAt: dayjs().add(5, "minute").toDate(),
  },
  {
    id: 1,
    name: "Alex",
    email: "alex@email.com",
    password: "alex",
    role: "cashier",
    createdAt: dayjs().add(10, "minute").toDate(),
  },
] as const;
