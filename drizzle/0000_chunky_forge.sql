CREATE TABLE "access_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"contact_id" integer,
	"recipient_email" text NOT NULL,
	"recipient_first_name" text,
	"recipient_last_name" text,
	"recipient_company" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"replied_at" timestamp,
	"bounced_at" timestamp,
	"unsubscribed_at" timestamp,
	"email_content" text,
	"email_subject" text,
	"sendgrid_message_id" text,
	"error_message" text,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"locked_by" text,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subject" text,
	"body" text,
	"prompt" text,
	"contact_list_id" integer,
	"sender_profile_id" integer,
	"strategic_profile_id" integer,
	"target_customer_profile_id" integer,
	"tone" text,
	"offer_type" text,
	"product_id" integer,
	"send_time_preference" text,
	"schedule_date" timestamp,
	"schedule_time" text,
	"timezone" text DEFAULT 'America/New_York',
	"autopilot_enabled" boolean DEFAULT false,
	"autopilot_settings" jsonb,
	"max_emails_per_day" integer DEFAULT 20,
	"delay_between_emails" integer DEFAULT 30,
	"requires_human_review" boolean DEFAULT true,
	"email_template_id" integer,
	"generation_type" text DEFAULT 'merge_field',
	"track_emails" boolean DEFAULT true,
	"unsubscribe_link" boolean DEFAULT true,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"duration_days" integer DEFAULT 14 NOT NULL,
	"daily_lead_target" integer DEFAULT 5 NOT NULL,
	"total_leads_generated" integer DEFAULT 0 NOT NULL,
	"response_rate" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communication_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"content_preview" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"thread_id" text,
	"parent_id" integer,
	"in_reply_to" text,
	"references" text,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"campaign_id" integer,
	"batch_id" integer,
	"template_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"clicked_links" jsonb DEFAULT '[]'::jsonb,
	"error_code" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"list_id" integer,
	"description" text,
	"age" integer,
	"size" integer,
	"website" text,
	"alternative_profile_url" text,
	"default_contact_email" text,
	"website_ranking" integer,
	"linkedin_prominence" integer,
	"customer_count" integer,
	"rating" integer,
	"services" jsonb DEFAULT '[]'::jsonb,
	"validation_points" jsonb DEFAULT '[]'::jsonb,
	"differentiation" jsonb DEFAULT '[]'::jsonb,
	"total_score" integer,
	"snapshot" jsonb,
	"city" text,
	"state" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_list_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"added_by" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "contact_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"contact_count" integer DEFAULT 0 NOT NULL,
	"no_duplicates_with_other_lists" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"company_id" integer,
	"name" text NOT NULL,
	"slug" text,
	"role" text,
	"email" text,
	"alternative_emails" jsonb DEFAULT '[]'::jsonb,
	"probability" integer,
	"linkedin_url" text,
	"twitter_handle" text,
	"phone_number" text,
	"department" text,
	"location" text,
	"city" text,
	"state" text,
	"country" text,
	"verification_source" text,
	"last_enriched" timestamp with time zone,
	"name_confidence_score" integer,
	"user_feedback_score" integer,
	"feedback_count" integer DEFAULT 0,
	"last_validated" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_searches" jsonb DEFAULT '[]'::jsonb,
	"contact_status" text DEFAULT 'uncontacted',
	"last_contacted_at" timestamp with time zone,
	"last_contact_channel" text,
	"total_communications" integer DEFAULT 0,
	"total_replies" integer DEFAULT 0,
	"last_thread_id" text,
	"feedback_type" text,
	"isp_context" text,
	"feedback_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"reward_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text NOT NULL,
	"target_description" text,
	"industries" text[],
	"roles" text[],
	"locations" text[],
	"company_sizes" text[],
	"tech_stack" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_outreach_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch_date" timestamp with time zone NOT NULL,
	"secure_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_outreach_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"communication_id" integer,
	"email_subject" text NOT NULL,
	"email_body" text NOT NULL,
	"email_tone" text NOT NULL,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"edited_content" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_outreach_job_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"batch_id" integer,
	"processing_time_ms" integer,
	"contacts_processed" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_outreach_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled',
	"last_error" text,
	"retry_count" integer DEFAULT 0,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"sequence_id" integer,
	"event_id" integer,
	"template_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sequence_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_id" integer NOT NULL,
	"template_key" text NOT NULL,
	"event_order" integer NOT NULL,
	"delay_hours" integer DEFAULT 0 NOT NULL,
	"delay_type" text DEFAULT 'hours' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guidance_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_path" text,
	"processed_path" text,
	"object_path" text,
	"timestamps" jsonb DEFAULT '[]'::jsonb,
	"duration" real,
	"file_size" integer,
	"error_message" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service" text NOT NULL,
	"email" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"current_step" text DEFAULT 'business_description',
	"is_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_promos" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"days_of_week" jsonb DEFAULT '[]'::jsonb,
	"show_free_trial" boolean DEFAULT true NOT NULL,
	"show_duckling" boolean DEFAULT true NOT NULL,
	"show_mama_duck" boolean DEFAULT true NOT NULL,
	"duckling_price" real,
	"duckling_credits" integer,
	"duckling_bonus" integer,
	"mama_duck_price" real,
	"mama_duck_credits" integer,
	"mama_duck_bonus" integer,
	"free_trial_credits" integer,
	"duckling_stripe_price_id" text,
	"mama_duck_stripe_price_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pricing_promos_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "search_jobs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_jobs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"job_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"search_type" text DEFAULT 'companies' NOT NULL,
	"contact_search_config" jsonb DEFAULT '{}',
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" jsonb DEFAULT '{}',
	"results" jsonb,
	"result_count" integer DEFAULT 0,
	"error" text,
	"source" text DEFAULT 'frontend' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"priority" integer DEFAULT 0,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "search_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "search_lists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"list_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"result_count" integer NOT NULL,
	"custom_search_targets" jsonb DEFAULT '[]',
	"total_contacts" integer,
	"total_emails" integer,
	"search_duration_seconds" integer,
	"source_breakdown" jsonb,
	"report_companies" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_queue_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"queue_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"search_job_id" integer,
	"list_id" integer,
	"result_count" integer,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_queues" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"campaign_id" integer,
	"status" text DEFAULT 'paused' NOT NULL,
	"auto_run_enabled" boolean DEFAULT false,
	"auto_run_threshold" integer DEFAULT 50,
	"delay_between_searches" integer DEFAULT 30,
	"results_per_search" integer DEFAULT 100,
	"continue_on_failure" boolean DEFAULT true,
	"remove_completed_searches" boolean DEFAULT false,
	"notify_on_complete" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sender_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"title" text,
	"company_position" text,
	"company_name" text,
	"company_website" text,
	"is_default" boolean DEFAULT false,
	"source" text DEFAULT 'manual',
	"gmail_account_email" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "site_stats_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "strategic_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"business_type" text NOT NULL,
	"business_description" text NOT NULL,
	"unique_attributes" text[],
	"target_customers" text NOT NULL,
	"market_niche" text,
	"product_service" text,
	"customer_feedback" text,
	"website" text,
	"business_location" text,
	"primary_customer_type" text,
	"primary_sales_channel" text,
	"primary_business_goal" text,
	"strategy_high_level_boundary" text,
	"example_sprint_planning_prompt" text,
	"example_daily_search_query" text,
	"product_analysis_summary" text,
	"report_sales_context_guidance" text,
	"report_sales_targeting_guidance" text,
	"product_offer_strategies" text,
	"daily_search_queries" text,
	"strategic_plan" jsonb DEFAULT '{}'::jsonb,
	"search_prompts" text[],
	"status" text DEFAULT 'in_progress',
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"plan_type" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_attribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source" text,
	"attribution_data" jsonb DEFAULT '{}'::jsonb,
	"conversion_events" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_purchased" integer DEFAULT 0 NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_email_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"preferred_method" text DEFAULT 'smart-default',
	"has_seen_first_time_modal" boolean DEFAULT false,
	"has_seen_ios_notification" boolean DEFAULT false,
	"has_seen_android_notification" boolean DEFAULT false,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_used_method" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_guidance_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"completed_quests" text[] DEFAULT '{}',
	"completed_challenges" jsonb DEFAULT '{}'::jsonb,
	"current_quest_id" text,
	"current_challenge_index" integer DEFAULT 0,
	"current_step_index" integer DEFAULT 0,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"priority" text DEFAULT 'normal',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_outreach_preferences" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true,
	"schedule_days" text[] DEFAULT '{"mon","tue","wed"}',
	"schedule_time" text DEFAULT '09:00',
	"timezone" text DEFAULT 'America/New_York',
	"min_contacts_required" integer DEFAULT 5,
	"active_product_id" integer,
	"active_sender_profile_id" integer,
	"active_customer_profile_id" integer,
	"vacation_mode" boolean DEFAULT false,
	"vacation_start_date" timestamp with time zone,
	"vacation_end_date" timestamp with time zone,
	"last_nudge_sent" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"namespace" text NOT NULL,
	"completed_milestones" text[] DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"firebase_uid" text,
	"created_at" timestamp DEFAULT now(),
	"is_guest" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_contact_list_id_contact_lists_id_fk" FOREIGN KEY ("contact_list_id") REFERENCES "public"."contact_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sender_profile_id_sender_profiles_id_fk" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."sender_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_strategic_profile_id_strategic_profiles_id_fk" FOREIGN KEY ("strategic_profile_id") REFERENCES "public"."strategic_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_target_customer_profile_id_customer_profiles_id_fk" FOREIGN KEY ("target_customer_profile_id") REFERENCES "public"."customer_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_history" ADD CONSTRAINT "communication_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_history" ADD CONSTRAINT "communication_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_history" ADD CONSTRAINT "communication_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_history" ADD CONSTRAINT "communication_history_batch_id_daily_outreach_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."daily_outreach_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_history" ADD CONSTRAINT "communication_history_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_list_id_contact_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_batches" ADD CONSTRAINT "daily_outreach_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_items" ADD CONSTRAINT "daily_outreach_items_batch_id_daily_outreach_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."daily_outreach_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_items" ADD CONSTRAINT "daily_outreach_items_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_items" ADD CONSTRAINT "daily_outreach_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_items" ADD CONSTRAINT "daily_outreach_items_communication_id_communication_history_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communication_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_job_logs" ADD CONSTRAINT "daily_outreach_job_logs_job_id_daily_outreach_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."daily_outreach_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_job_logs" ADD CONSTRAINT "daily_outreach_job_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_job_logs" ADD CONSTRAINT "daily_outreach_job_logs_batch_id_daily_outreach_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."daily_outreach_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_outreach_jobs" ADD CONSTRAINT "daily_outreach_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_event_id_email_sequence_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."email_sequence_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequence_events" ADD CONSTRAINT "email_sequence_events_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guidance_videos" ADD CONSTRAINT "guidance_videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_chats" ADD CONSTRAINT "onboarding_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_chats" ADD CONSTRAINT "onboarding_chats_profile_id_strategic_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."strategic_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_jobs" ADD CONSTRAINT "search_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_lists" ADD CONSTRAINT "search_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queue_items" ADD CONSTRAINT "search_queue_items_queue_id_search_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."search_queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queue_items" ADD CONSTRAINT "search_queue_items_search_job_id_search_jobs_id_fk" FOREIGN KEY ("search_job_id") REFERENCES "public"."search_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queue_items" ADD CONSTRAINT "search_queue_items_list_id_search_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."search_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queues" ADD CONSTRAINT "search_queues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queues" ADD CONSTRAINT "search_queues_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sender_profiles" ADD CONSTRAINT "sender_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_profiles" ADD CONSTRAINT "strategic_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_attribution" ADD CONSTRAINT "user_attribution_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email_preferences" ADD CONSTRAINT "user_email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guidance_progress" ADD CONSTRAINT "user_guidance_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outreach_preferences" ADD CONSTRAINT "user_outreach_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outreach_preferences" ADD CONSTRAINT "user_outreach_preferences_active_product_id_strategic_profiles_id_fk" FOREIGN KEY ("active_product_id") REFERENCES "public"."strategic_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outreach_preferences" ADD CONSTRAINT "user_outreach_preferences_active_sender_profile_id_sender_profiles_id_fk" FOREIGN KEY ("active_sender_profile_id") REFERENCES "public"."sender_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outreach_preferences" ADD CONSTRAINT "user_outreach_preferences_active_customer_profile_id_customer_profiles_id_fk" FOREIGN KEY ("active_customer_profile_id") REFERENCES "public"."customer_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_access_applications_email" ON "access_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_access_applications_status" ON "access_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_campaign_id" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_contact_id" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_email" ON "campaign_recipients" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_status" ON "campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_campaign_recipient_unique" ON "campaign_recipients" USING btree ("campaign_id","recipient_email");--> statement-breakpoint
CREATE INDEX "idx_comm_contact_id" ON "communication_history" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_comm_company_id" ON "communication_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_comm_user_id" ON "communication_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comm_channel" ON "communication_history" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_comm_status" ON "communication_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_comm_thread_id" ON "communication_history" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_comm_sent_at" ON "communication_history" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_comm_created_at" ON "communication_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_comm_contact_sent" ON "communication_history" USING btree ("contact_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_companies_user_id" ON "companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_companies_list_id" ON "companies" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "idx_companies_name" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_companies_slug" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_contact_list_members_list_id" ON "contact_list_members" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "idx_contact_list_members_contact_id" ON "contact_list_members" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contact_list_unique" ON "contact_list_members" USING btree ("list_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_company_id" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_user_id" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contacts_slug" ON "contacts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_credit_transactions_user_id" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_credit_transactions_type" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_credit_transactions_created_at" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_credit_transactions_reward_key" ON "credit_transactions" USING btree ("user_id","reward_key");--> statement-breakpoint
CREATE INDEX "idx_outreach_batch_user_id" ON "daily_outreach_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_batch_token" ON "daily_outreach_batches" USING btree ("secure_token");--> statement-breakpoint
CREATE INDEX "idx_outreach_batch_date" ON "daily_outreach_batches" USING btree ("batch_date");--> statement-breakpoint
CREATE INDEX "idx_outreach_item_batch_id" ON "daily_outreach_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_item_contact_id" ON "daily_outreach_items" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_item_communication_id" ON "daily_outreach_items" USING btree ("communication_id");--> statement-breakpoint
CREATE INDEX "idx_job_logs_job_id" ON "daily_outreach_job_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_logs_user_id" ON "daily_outreach_job_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_job_logs_executed_at" ON "daily_outreach_job_logs" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_next_run" ON "daily_outreach_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_user_status" ON "daily_outreach_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_jobs_retry" ON "daily_outreach_jobs" USING btree ("next_retry_at","retry_count");--> statement-breakpoint
CREATE INDEX "idx_email_sends_recipient" ON "email_sends" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "idx_email_sends_status" ON "email_sends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_sends_scheduled" ON "email_sends" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_email_sends_sequence" ON "email_sends" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_email_sends_pending" ON "email_sends" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_email_sequence_events_sequence" ON "email_sequence_events" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_email_sequence_events_template" ON "email_sequence_events" USING btree ("template_key");--> statement-breakpoint
CREATE INDEX "idx_email_sequence_events_order" ON "email_sequence_events" USING btree ("sequence_id","event_order");--> statement-breakpoint
CREATE INDEX "idx_email_sequences_active" ON "email_sequences" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_guidance_videos_challenge" ON "guidance_videos" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "idx_guidance_videos_quest" ON "guidance_videos" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "idx_guidance_videos_status" ON "guidance_videos" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_tokens_user_service" ON "oauth_tokens" USING btree ("user_id","service");--> statement-breakpoint
CREATE INDEX "idx_oauth_tokens_user_id" ON "oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_tokens_service" ON "oauth_tokens" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_pricing_promos_code" ON "pricing_promos" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_pricing_promos_active" ON "pricing_promos" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_pricing_promos_priority" ON "pricing_promos" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_search_jobs_user_id" ON "search_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_search_jobs_job_id" ON "search_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_search_jobs_status" ON "search_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_search_jobs_created_at" ON "search_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_search_jobs_priority_status" ON "search_jobs" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "idx_search_lists_user_id" ON "search_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_search_lists_list_id" ON "search_lists" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "idx_search_queue_items_queue_id" ON "search_queue_items" USING btree ("queue_id");--> statement-breakpoint
CREATE INDEX "idx_search_queue_items_status" ON "search_queue_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_search_queue_items_order" ON "search_queue_items" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_search_queue_item_order" ON "search_queue_items" USING btree ("queue_id","order");--> statement-breakpoint
CREATE INDEX "idx_search_queues_user_id" ON "search_queues" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_search_queues_campaign_id" ON "search_queues" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_search_queues_status" ON "search_queues" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subscriptions_user_id" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_attribution_user_id" ON "user_attribution" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_attribution_source" ON "user_attribution" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_credits_user_id" ON "user_credits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_guidance_progress_user_id" ON "user_guidance_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_user_id" ON "user_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_status" ON "user_notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_created_at" ON "user_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_outreach_pref_enabled" ON "user_outreach_preferences" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_progress_user_namespace" ON "user_progress" USING btree ("user_id","namespace");--> statement-breakpoint
CREATE INDEX "idx_user_progress_user_id" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_progress_namespace" ON "user_progress" USING btree ("namespace");