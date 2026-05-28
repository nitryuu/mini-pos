import dayjs from "dayjs";

export const data = [
  {
    id: 1,
    orderNumber: "ORD-20260503-0001",
    paymentId: 1,
    buyerId: null,
    total: "2000.00",
    status: "active",
    createdAt: dayjs().add(5, "minute").toDate(),
  },
  {
    id: 2,
    orderNumber: "ORD-20260503-0002",
    paymentId: 1,
    buyerId: null,
    total: "2000.00",
    status: "inactive",
    createdAt: dayjs().add(1, "day").toDate(),
  },
] as const;

export const dataItem = [
  {
    id: 1,
    orderId: 1,
    productId: 1,
    name: "Product A",
    qty: 2,
    price: "2000",
    total: "4000",
  },
  {
    id: 2,
    orderId: 2,
    productId: 2,
    name: "Product B",
    qty: 3,
    price: "4000",
    total: "12000",
  },
];

export const createData = [
  {
    paymentId: 1,
    buyerId: null,
    paid: "20000",
    date: dayjs().add(5, "minute").toDate(),
    items: [
      {
        productId: 1,
        qty: 2,
        price: "3000",
      },
      {
        productId: 2,
        qty: 2,
        price: "7000",
      },
    ],
  },
  {
    paymentId: 1,
    buyerId: null,
    paid: "6000",
    date: dayjs().add(1, "day").toDate(),
    items: [
      {
        productId: 1,
        qty: 2,
        price: "3000",
      },
    ],
  },
];
