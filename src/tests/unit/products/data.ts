import dayjs from "dayjs";

export const data = [
  {
    id: 1,
    barcode: "12309809ads",
    name: "Product A",
    qty: 6,
    price: "1000.00",
    image: null,
    createdAt: dayjs().add(5, "minute").toDate(),
  },
  {
    id: 2,
    barcode: null,
    name: "Product B",
    qty: 10,
    price: "4000.00",
    image: null,
    createdAt: dayjs().add(10, "minute").toDate(),
  },
];
