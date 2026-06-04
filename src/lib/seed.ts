import { payments } from "@/models";
import { db } from "./db";

const seed = async () => {
  await db
    .insert(payments)
    .values([{ name: "Cash" }, { name: "Transfer" }])
    .onConflictDoNothing();

  console.log("Seeded successfully");
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
