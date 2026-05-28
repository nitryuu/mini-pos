DROP INDEX "idx_notifications_role";--> statement-breakpoint
DROP INDEX "idx_notifications_user_id_role";--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id_role_type" ON "notifications" USING btree ("user_id","role","type");