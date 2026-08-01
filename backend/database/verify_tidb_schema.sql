-- =============================================================================
-- TiDB Branch Verification Script (Deep Exhaustive Type Checks)
-- =============================================================================
SELECT 'TABLE' AS object_type, e.exp_table_name AS object_name,
       CASE WHEN a.table_name IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END as status,
       'Expected existence' AS expected, COALESCE(a.table_name, 'N/A') AS actual
FROM (
  SELECT 'email_outbox' AS exp_table_name UNION ALL
  SELECT 'promo_codes' AS exp_table_name UNION ALL
  SELECT 'notifications' AS exp_table_name UNION ALL
  SELECT 'checkin_reminders' AS exp_table_name UNION ALL
  SELECT 'hotel_images' AS exp_table_name UNION ALL
  SELECT 'audit_logs' AS exp_table_name UNION ALL
  SELECT 'support_tickets' AS exp_table_name UNION ALL
  SELECT 'review_reports' AS exp_table_name UNION ALL
  SELECT 'invoices' AS exp_table_name UNION ALL
  SELECT 'receipts' AS exp_table_name
) e
LEFT JOIN information_schema.tables a
  ON e.exp_table_name = a.table_name AND a.table_schema = DATABASE();

SELECT 'COLUMN' AS object_type, CONCAT(e.t, '.', e.c) AS object_name,
       CASE
         WHEN a.column_name IS NULL THEN 'MISSING'
         WHEN LOWER(a.column_type) != LOWER(e.ty)
           OR a.is_nullable != e.n
           OR LOWER(REPLACE(COALESCE(CAST(a.column_default AS CHAR), 'NULL'), '()', ''))
              != LOWER(REPLACE(e.d, '()', ''))
           OR LOWER(REPLACE(TRIM(REPLACE(LOWER(a.extra), 'default_generated', '')), '()', ''))
              != LOWER(REPLACE(e.e, '()', ''))
         THEN 'MISMATCH'
         ELSE 'PRESENT'
       END as status,
       CONCAT('type=', e.ty, ', null=', e.n, ', def=', e.d, ', ext=', e.e) AS expected,
       CONCAT('type=', COALESCE(a.column_type, 'N/A'),
              ', null=', COALESCE(a.is_nullable, 'N/A'),
              ', def=', COALESCE(a.column_default, 'NULL'),
              ', ext=', COALESCE(a.extra, 'N/A')) AS actual
FROM (
  SELECT 'users' as t, 'email_verified_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'email_verification_token_hash' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'email_verification_expires_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'password_reset_token_hash' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'password_reset_expires_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'password_changed_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'is_active' as c, 'tinyint(1)' as ty, 'NO' as n, '1' as d, '' as e UNION ALL
  SELECT 'users' as t, 'deactivated_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'users' as t, 'deactivation_reason' as c, 'varchar(500)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'expires_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'cancelled_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'cancellation_reason' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'cancelled_by_user_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'checked_in_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'checked_out_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'no_show_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_status' as c, 'varchar(20)' as ty, 'NO' as n, 'not_required' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_requested_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_completed_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'booking_status' as c, 'enum(''pending'',''confirmed'',''checked_in'',''checked_out'',''cancelled'',''no_show'',''expired'',''refunded'',''completed'')' as ty, 'NO' as n, 'pending' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'promo_code_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'original_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'discount_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'final_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'promo_reserved' as c, 'tinyint(1)' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_provider_reference' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_reason' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_admin_notes' as c, 'text' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_processing_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_rejected_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'bookings' as t, 'refund_failed_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'rooms' as t, 'is_archived' as c, 'tinyint(1)' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'hotels' as t, 'latitude' as c, 'decimal(10,7)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'hotels' as t, 'longitude' as c, 'decimal(10,7)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'payments' as t, 'original_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'payments' as t, 'discount_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'payments' as t, 'final_amount' as c, 'decimal(10,2)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'reviews' as t, 'is_hidden' as c, 'tinyint(1)' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'reviews' as t, 'hidden_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'reviews' as t, 'hidden_by_admin_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'reviews' as t, 'is_deleted' as c, 'tinyint(1)' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'reviews' as t, 'deleted_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'email_outbox' as t, 'event_key' as c, 'varchar(150)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'event_type' as c, 'varchar(50)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'recipient_user_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'recipient_email' as c, 'varchar(150)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'payload' as c, 'json' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'payload_expires_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'status' as c, 'enum(''pending'',''processing'',''sent'',''failed'',''dead_letter'')' as ty, 'NO' as n, 'pending' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'attempts' as c, 'int' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'max_attempts' as c, 'int' as ty, 'NO' as n, '3' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'next_attempt_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'locked_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'locked_by' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'last_error_code' as c, 'text' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'sent_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'email_outbox' as t, 'updated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, 'on update current_timestamp()' as e UNION ALL
  SELECT 'promo_codes' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'promo_codes' as t, 'code' as c, 'varchar(50)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'discount_type' as c, 'enum(''fixed'',''percentage'')' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'discount_value' as c, 'decimal(10,2)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'start_date' as c, 'date' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'end_date' as c, 'date' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'usage_limit' as c, 'int' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'times_used' as c, 'int' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'times_reserved' as c, 'int' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'min_booking_value' as c, 'decimal(10,2)' as ty, 'NO' as n, '0.00' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'is_active' as c, 'tinyint(1)' as ty, 'NO' as n, '1' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'description' as c, 'varchar(255)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'promo_codes' as t, 'updated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, 'on update current_timestamp()' as e UNION ALL
  SELECT 'notifications' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'notifications' as t, 'user_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'event_key' as c, 'varchar(150)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'type' as c, 'enum(''booking'',''payment'',''refund'',''reminder'',''system'')' as ty, 'NO' as n, 'system' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'title' as c, 'varchar(255)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'message' as c, 'text' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'metadata' as c, 'json' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'read_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'expires_at' as c, 'timestamp' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'notifications' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'checkin_reminders' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'checkin_reminders' as t, 'booking_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'checkin_reminders' as t, 'sent_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'hotel_images' as t, 'hotel_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'storage_key' as c, 'varchar(512)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'url' as c, 'varchar(1024)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'alt_text' as c, 'varchar(255)' as ty, 'NO' as n, '' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'sort_order' as c, 'smallint' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'is_cover' as c, 'tinyint(1)' as ty, 'NO' as n, '0' as d, '' as e UNION ALL
  SELECT 'hotel_images' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'id' as c, 'bigint' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'audit_logs' as t, 'admin_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'action' as c, 'varchar(100)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'entity_type' as c, 'varchar(60)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'entity_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'metadata' as c, 'json' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'ip_address' as c, 'varchar(45)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'audit_logs' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'support_tickets' as t, 'user_id' as c, 'int' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'ticket_ref' as c, 'varchar(20)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'name' as c, 'varchar(80)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'email' as c, 'varchar(150)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'subject' as c, 'varchar(120)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'category' as c, 'enum(''booking'',''payment'',''refund'',''technical'',''complaint'',''other'')' as ty, 'NO' as n, 'other' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'message' as c, 'text' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'status' as c, 'enum(''open'',''in_progress'',''resolved'',''closed'')' as ty, 'NO' as n, 'open' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'agent_notes' as c, 'text' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'lookup_token_hash' as c, 'varchar(64)' as ty, 'YES' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'support_tickets' as t, 'updated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, 'on update current_timestamp()' as e UNION ALL
  SELECT 'review_reports' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'review_reports' as t, 'review_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'reporter_user_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'reason' as c, 'varchar(2000)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'category' as c, 'enum(''spam'',''offensive'',''fake'',''irrelevant'',''other'')' as ty, 'NO' as n, 'other' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'status' as c, 'enum(''pending'',''dismissed'',''actioned'')' as ty, 'NO' as n, 'pending' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'created_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'review_reports' as t, 'updated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, 'on update current_timestamp()' as e UNION ALL
  SELECT 'invoices' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'invoices' as t, 'booking_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'invoices' as t, 'invoice_number' as c, 'varchar(30)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'invoices' as t, 'generated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e UNION ALL
  SELECT 'receipts' as t, 'id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, 'auto_increment' as e UNION ALL
  SELECT 'receipts' as t, 'booking_id' as c, 'int' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'receipts' as t, 'receipt_number' as c, 'varchar(30)' as ty, 'NO' as n, 'NULL' as d, '' as e UNION ALL
  SELECT 'receipts' as t, 'generated_at' as c, 'timestamp' as ty, 'NO' as n, 'current_timestamp()' as d, '' as e
) e
LEFT JOIN information_schema.columns a
  ON e.t = a.table_name AND e.c = a.column_name AND a.table_schema = DATABASE();

SELECT 'INDEX' AS object_type, CONCAT(e.t, '.', e.i) AS object_name,
       CASE
         WHEN a.index_name IS NULL THEN 'MISSING'
         WHEN a.is_unique != e.u OR a.cols != e.cols THEN 'MISMATCH'
         ELSE 'PRESENT'
       END as status,
       CONCAT('unique=', e.u, ', cols=', e.cols) AS expected,
       CONCAT('unique=', COALESCE(a.is_unique, 'N/A'), ', cols=', COALESCE(a.cols, 'N/A')) AS actual
FROM (
  SELECT 'users' as t, 'idx_users_is_active' as i, 0 as u, 'is_active' as cols UNION ALL
  SELECT 'email_outbox' as t, 'uq_email_outbox_event_key' as i, 1 as u, 'event_key' as cols UNION ALL
  SELECT 'email_outbox' as t, 'idx_email_outbox_status_next_attempt' as i, 0 as u, 'status,next_attempt_at' as cols UNION ALL
  SELECT 'email_outbox' as t, 'idx_email_outbox_locked_at' as i, 0 as u, 'locked_at' as cols UNION ALL
  SELECT 'promo_codes' as t, 'uq_promo_codes_code' as i, 1 as u, 'code' as cols UNION ALL
  SELECT 'promo_codes' as t, 'idx_promo_codes_active_dates' as i, 0 as u, 'is_active,start_date,end_date' as cols UNION ALL
  SELECT 'notifications' as t, 'uq_notifications_event_key' as i, 1 as u, 'event_key' as cols UNION ALL
  SELECT 'notifications' as t, 'idx_notifications_user_read_created' as i, 0 as u, 'user_id,read_at,created_at' as cols UNION ALL
  SELECT 'checkin_reminders' as t, 'uq_checkin_reminder_booking' as i, 1 as u, 'booking_id' as cols UNION ALL
  SELECT 'hotel_images' as t, 'uq_hotel_images_storage_key' as i, 1 as u, 'storage_key' as cols UNION ALL
  SELECT 'hotel_images' as t, 'idx_hotel_images_hotel_id' as i, 0 as u, 'hotel_id' as cols UNION ALL
  SELECT 'hotel_images' as t, 'idx_hotel_images_sort' as i, 0 as u, 'hotel_id,sort_order' as cols UNION ALL
  SELECT 'audit_logs' as t, 'idx_audit_admin_id' as i, 0 as u, 'admin_id' as cols UNION ALL
  SELECT 'audit_logs' as t, 'idx_audit_action' as i, 0 as u, 'action' as cols UNION ALL
  SELECT 'audit_logs' as t, 'idx_audit_entity' as i, 0 as u, 'entity_type,entity_id' as cols UNION ALL
  SELECT 'audit_logs' as t, 'idx_audit_created_at' as i, 0 as u, 'created_at' as cols UNION ALL
  SELECT 'support_tickets' as t, 'uq_support_ticket_ref' as i, 1 as u, 'ticket_ref' as cols UNION ALL
  SELECT 'support_tickets' as t, 'uq_support_lookup_hash' as i, 1 as u, 'lookup_token_hash' as cols UNION ALL
  SELECT 'support_tickets' as t, 'idx_support_user_id' as i, 0 as u, 'user_id' as cols UNION ALL
  SELECT 'support_tickets' as t, 'idx_support_status' as i, 0 as u, 'status' as cols UNION ALL
  SELECT 'support_tickets' as t, 'idx_support_created_at' as i, 0 as u, 'created_at' as cols UNION ALL
  SELECT 'review_reports' as t, 'uq_review_report_pending' as i, 1 as u, 'review_id,reporter_user_id,status' as cols UNION ALL
  SELECT 'review_reports' as t, 'idx_review_reports_review_id' as i, 0 as u, 'review_id' as cols UNION ALL
  SELECT 'review_reports' as t, 'idx_review_reports_reporter' as i, 0 as u, 'reporter_user_id' as cols UNION ALL
  SELECT 'review_reports' as t, 'idx_review_reports_status' as i, 0 as u, 'status' as cols UNION ALL
  SELECT 'invoices' as t, 'uq_invoices_booking_id' as i, 1 as u, 'booking_id' as cols UNION ALL
  SELECT 'invoices' as t, 'uq_invoices_invoice_number' as i, 1 as u, 'invoice_number' as cols UNION ALL
  SELECT 'receipts' as t, 'uq_receipts_booking_id' as i, 1 as u, 'booking_id' as cols UNION ALL
  SELECT 'receipts' as t, 'uq_receipts_receipt_number' as i, 1 as u, 'receipt_number' as cols
) e
LEFT JOIN (
  SELECT table_name, index_name, MAX(CASE WHEN non_unique = 0 THEN 1 ELSE 0 END) as is_unique,
         GROUP_CONCAT(column_name ORDER BY seq_in_index ASC SEPARATOR ',') as cols
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
  GROUP BY table_name, index_name
) a ON e.t = a.table_name AND e.i = a.index_name;

SELECT 'FOREIGN KEY' AS object_type, CONCAT(e.t, '.', e.fk) AS object_name,
       CASE
         WHEN a.constraint_name IS NULL THEN 'MISSING'
         WHEN a.c != e.c OR a.rt != e.rt OR a.rc != e.rc OR a.ur != e.ur OR a.dr != e.dr THEN 'MISMATCH'
         ELSE 'PRESENT'
       END as status,
       CONCAT('child=', e.c, ', ref=', e.rt, '.', e.rc, ', on_update=', e.ur, ', on_delete=', e.dr) AS expected,
       CONCAT('child=', COALESCE(a.c, 'N/A'), ', ref=', COALESCE(a.rt, 'N/A'), '.', COALESCE(a.rc, 'N/A'),
              ', on_update=', COALESCE(a.ur, 'N/A'), ', on_delete=', COALESCE(a.dr, 'N/A')) AS actual
FROM (
  SELECT 'email_outbox' as t, 'fk_email_outbox_user' as fk, 'recipient_user_id' as c, 'users' as rt, 'id' as rc, 'CASCADE' as ur, 'SET NULL' as dr UNION ALL
  SELECT 'bookings' as t, 'fk_bookings_promo_code' as fk, 'promo_code_id' as c, 'promo_codes' as rt, 'id' as rc, 'CASCADE' as ur, 'SET NULL' as dr UNION ALL
  SELECT 'notifications' as t, 'fk_notifications_user' as fk, 'user_id' as c, 'users' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'checkin_reminders' as t, 'fk_checkin_reminders_booking' as fk, 'booking_id' as c, 'bookings' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'hotel_images' as t, 'fk_hotel_images_hotel' as fk, 'hotel_id' as c, 'hotels' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'audit_logs' as t, 'fk_audit_admin' as fk, 'admin_id' as c, 'users' as rt, 'id' as rc, 'CASCADE' as ur, 'SET NULL' as dr UNION ALL
  SELECT 'support_tickets' as t, 'fk_support_user' as fk, 'user_id' as c, 'users' as rt, 'id' as rc, 'CASCADE' as ur, 'SET NULL' as dr UNION ALL
  SELECT 'review_reports' as t, 'fk_review_reports_review' as fk, 'review_id' as c, 'reviews' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'review_reports' as t, 'fk_review_reports_reporter' as fk, 'reporter_user_id' as c, 'users' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'invoices' as t, 'fk_invoices_booking' as fk, 'booking_id' as c, 'bookings' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr UNION ALL
  SELECT 'receipts' as t, 'fk_receipts_booking' as fk, 'booking_id' as c, 'bookings' as rt, 'id' as rc, 'CASCADE' as ur, 'CASCADE' as dr
) e
LEFT JOIN (
  SELECT k.table_name, k.constraint_name, k.column_name as c, k.referenced_table_name as rt,
         k.referenced_column_name as rc, r.update_rule as ur, r.delete_rule as dr
  FROM information_schema.key_column_usage k
  JOIN information_schema.referential_constraints r
    ON k.constraint_name = r.constraint_name
   AND k.table_schema = r.constraint_schema
   AND k.table_name = r.table_name
  WHERE k.table_schema = DATABASE() AND k.referenced_table_name IS NOT NULL
) a ON e.t = a.table_name AND e.fk = a.constraint_name;
