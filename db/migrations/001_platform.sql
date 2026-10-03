CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false, image text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), role text NOT NULL DEFAULT 'student' CHECK(role IN ('student','lecturer','admin','super_admin')));
CREATE TABLE IF NOT EXISTS session (id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS account (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS session_user_idx ON session("userId");
CREATE INDEX IF NOT EXISTS account_user_idx ON account("userId");
CREATE TABLE roles (name text PRIMARY KEY, description text NOT NULL);
INSERT INTO roles VALUES ('student','Academic learner'),('lecturer','Assigned course contributor'),('admin','Academic administrator'),('super_admin','Platform governance');
CREATE TABLE permissions (key text PRIMARY KEY, description text NOT NULL);
INSERT INTO permissions SELECT key, replace(key,'.',' ') FROM unnest(ARRAY['users.read','users.manage','courses.read','courses.manage','resources.read','resources.write','resources.moderate','quizzes.write','announcements.manage','analytics.read','reports.read','audit.read','system.manage','ai.use']) key;
CREATE TABLE role_permissions (role text REFERENCES roles(name), permission_key text REFERENCES permissions(key), PRIMARY KEY(role,permission_key));
INSERT INTO role_permissions SELECT 'student', key FROM permissions WHERE key IN ('courses.read','resources.read','ai.use');
INSERT INTO role_permissions SELECT 'lecturer', key FROM permissions WHERE key IN ('courses.read','resources.read','resources.write','quizzes.write','announcements.manage','analytics.read','ai.use');
INSERT INTO role_permissions SELECT 'admin', key FROM permissions WHERE key <> 'system.manage';
INSERT INTO role_permissions SELECT 'super_admin', key FROM permissions;
CREATE TABLE faculties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, code text NOT NULL UNIQUE, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), faculty_id uuid NOT NULL REFERENCES faculties, name text NOT NULL, code text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE programmes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments, name text NOT NULL, code text NOT NULL UNIQUE, degree_type text NOT NULL DEFAULT 'BSc', duration integer NOT NULL DEFAULT 4 CHECK(duration BETWEEN 1 AND 10), description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE academic_levels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, value integer NOT NULL UNIQUE CHECK(value BETWEEN 100 AND 900), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO academic_levels(name,value) VALUES ('Level 100',100),('Level 200',200),('Level 300',300),('Level 400',400),('Level 600',600);
CREATE TABLE academic_terms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, academic_year text NOT NULL, start_date date NOT NULL, end_date date NOT NULL, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(end_date >= start_date));
CREATE TABLE profiles (user_id text PRIMARY KEY REFERENCES "user" ON DELETE CASCADE, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')), programme_id uuid REFERENCES programmes, department_id uuid REFERENCES departments, level integer, student_id text, staff_id text, bio text NOT NULL DEFAULT '', preferences jsonb NOT NULL DEFAULT '{}', last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, title text NOT NULL, description text NOT NULL DEFAULT '', credit_hours integer NOT NULL DEFAULT 3 CHECK(credit_hours BETWEEN 1 AND 12), level integer NOT NULL DEFAULT 100, department_id uuid NOT NULL REFERENCES departments, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE course_offerings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses, academic_term_id uuid NOT NULL REFERENCES academic_terms, lecturer_id text NOT NULL REFERENCES "user", programme_id uuid NOT NULL REFERENCES programmes, level integer NOT NULL DEFAULT 100, capacity integer NOT NULL DEFAULT 200 CHECK(capacity > 0), status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(course_id,academic_term_id,programme_id));
CREATE TABLE enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id text NOT NULL REFERENCES "user", course_offering_id uuid NOT NULL REFERENCES course_offerings, status text NOT NULL DEFAULT 'active', enrolled_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id,course_offering_id));
CREATE TABLE resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses, uploaded_by text NOT NULL REFERENCES "user", academic_term_id uuid REFERENCES academic_terms, title text NOT NULL, description text NOT NULL DEFAULT '', type text NOT NULL, category text NOT NULL DEFAULT 'Lecture Notes', storage_path text, external_url text, thumbnail_path text, file_size bigint NOT NULL DEFAULT 0, mime_type text, duration numeric, version integer NOT NULL DEFAULT 1, moderation_status text NOT NULL DEFAULT 'draft' CHECK(moderation_status IN ('draft','pending','approved','rejected','correction_required','archived')), moderation_notes text NOT NULL DEFAULT '', visibility text NOT NULL DEFAULT 'enrolled' CHECK(visibility IN ('enrolled','public')), allow_download boolean NOT NULL DEFAULT true, scan_status text NOT NULL DEFAULT 'pending' CHECK(scan_status IN ('pending','clean','blocked','not_required')), extracted_text text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE resource_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES resources, version integer NOT NULL, storage_path text NOT NULL, file_size bigint NOT NULL, created_by text NOT NULL REFERENCES "user", created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(resource_id,version));
CREATE TABLE resource_views (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES resources, user_id text NOT NULL REFERENCES "user", created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE resource_downloads (LIKE resource_views INCLUDING ALL);
ALTER TABLE resource_downloads ADD FOREIGN KEY(resource_id) REFERENCES resources;
ALTER TABLE resource_downloads ADD FOREIGN KEY(user_id) REFERENCES "user";
CREATE TABLE bookmarks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", resource_id uuid REFERENCES resources, course_id uuid REFERENCES courses, created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(resource_id,course_id)=1), UNIQUE(user_id,resource_id), UNIQUE(user_id,course_id));
CREATE TABLE progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", resource_id uuid NOT NULL REFERENCES resources, percentage numeric NOT NULL DEFAULT 0 CHECK(percentage BETWEEN 0 AND 100), playback_position numeric NOT NULL DEFAULT 0 CHECK(playback_position >= 0), completed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,resource_id));
CREATE TABLE quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses, created_by text NOT NULL REFERENCES "user", title text NOT NULL, description text NOT NULL DEFAULT '', time_limit integer NOT NULL DEFAULT 30 CHECK(time_limit BETWEEN 1 AND 240), max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 20), available_from timestamptz, available_until timestamptz, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')), allow_review boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(available_until IS NULL OR available_from IS NULL OR available_until > available_from));
CREATE TABLE quiz_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES quizzes ON DELETE CASCADE, prompt text NOT NULL, type text NOT NULL CHECK(type IN ('multiple_choice','true_false','short_answer')), points integer NOT NULL DEFAULT 1 CHECK(points BETWEEN 1 AND 100), position integer NOT NULL, UNIQUE(quiz_id,position));
CREATE TABLE quiz_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES quiz_questions ON DELETE CASCADE, label text NOT NULL, position integer NOT NULL);
CREATE TABLE quiz_keys (question_id uuid PRIMARY KEY REFERENCES quiz_questions ON DELETE CASCADE, answer text NOT NULL, explanation text NOT NULL DEFAULT '');
CREATE TABLE quiz_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES quizzes, user_id text NOT NULL REFERENCES "user", started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, submitted_at timestamptz, earned numeric, total numeric, score numeric, answers jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX one_live_attempt ON quiz_attempts(quiz_id,user_id) WHERE submitted_at IS NULL;
CREATE TABLE quiz_answers (attempt_id uuid NOT NULL REFERENCES quiz_attempts, question_id uuid NOT NULL REFERENCES quiz_questions, answer text NOT NULL, points numeric NOT NULL DEFAULT 0, PRIMARY KEY(attempt_id,question_id));
CREATE TABLE announcements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by text NOT NULL REFERENCES "user", title text NOT NULL, body text NOT NULL, course_id uuid REFERENCES courses, programme_id uuid REFERENCES programmes, department_id uuid REFERENCES departments, level integer, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','archived')), publish_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", title text NOT NULL, body text NOT NULL DEFAULT '', href text NOT NULL DEFAULT '/notifications', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE calendar_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by text NOT NULL REFERENCES "user", course_id uuid REFERENCES courses, title text NOT NULL, description text NOT NULL DEFAULT '', kind text NOT NULL DEFAULT 'study', starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','course','global')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>=starts_at), CHECK(visibility <> 'course' OR course_id IS NOT NULL));
CREATE TABLE notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", course_id uuid REFERENCES courses, resource_id uuid REFERENCES resources, title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by text NOT NULL REFERENCES "user", title text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text REFERENCES "user", action text NOT NULL, target text NOT NULL, target_id text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ai_conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ai_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES ai_conversations ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL, sources jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE document_chunks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES resources ON DELETE CASCADE, content text NOT NULL, position integer NOT NULL, search tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX document_search ON document_chunks USING gin(search);
CREATE TABLE system_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_by text REFERENCES "user", updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO system_settings(key,value) VALUES ('ai','{"enabled":false,"provider":"openrouter","model":"","student_access":true,"lecturer_access":true,"allow_private_materials":false,"daily_limit":30,"max_tokens":1500,"temperature":0.4}'),('platform','{"name":"UG LearnHub","official_affiliation":false,"support_email":"","maintenance":false}');
CREATE TABLE feature_flags (key text PRIMARY KEY, enabled boolean NOT NULL DEFAULT true, description text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO feature_flags VALUES ('resources',true,'Resource library',now()),('quizzes',true,'Academic quizzes',now()),('ai',false,'Academic assistant',now());
CREATE TABLE upload_intents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user", course_id uuid NOT NULL REFERENCES courses, pathname text NOT NULL UNIQUE, filename text NOT NULL, mime_type text NOT NULL, file_size bigint NOT NULL, completed_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE request_limits (key text PRIMARY KEY, count integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL);
CREATE INDEX resources_course_status ON resources(course_id,moderation_status);
CREATE INDEX offerings_lecturer ON course_offerings(lecturer_id);
CREATE INDEX enrollment_student ON enrollments(student_id);
CREATE INDEX notifications_user ON notifications(user_id,read_at);
CREATE INDEX audit_created ON audit_logs(created_at DESC);
CREATE INDEX attempts_user ON quiz_attempts(user_id,quiz_id);

-- These narrowly scoped helpers avoid policy recursion. Never accept role claims
-- from HTTP input; the transaction's user ID comes from the verified auth session.
CREATE FUNCTION app_uid() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id',true),'') $$;
CREATE FUNCTION app_permission(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM "user" u LEFT JOIN profiles pr ON pr.user_id=u.id WHERE u.id=app_uid() AND COALESCE(pr.status,'active')='active' AND (u.role='super_admin' OR EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role=u.role AND rp.permission_key=p)))
$$;
CREATE FUNCTION app_teaches(c uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM course_offerings WHERE course_id=c AND lecturer_id=app_uid() AND status='active') $$;
CREATE FUNCTION app_enrolled(c uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM enrollments e JOIN course_offerings o ON o.id=e.course_offering_id WHERE o.course_id=c AND e.student_id=app_uid() AND e.status='active' AND o.status='active') $$;
CREATE FUNCTION app_resource(r uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM resources WHERE id=r AND (app_permission('resources.moderate') OR (uploaded_by=app_uid() AND app_permission('resources.write') AND app_teaches(course_id)) OR (moderation_status='approved' AND scan_status IN ('clean','not_required') AND (visibility='public' OR app_enrolled(course_id) OR app_teaches(course_id))))) $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['faculties','departments','programmes','academic_levels','academic_terms','courses','course_offerings'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  IF t <> 'academic_levels' THEN EXECUTE format('CREATE POLICY catalog_read ON %I FOR SELECT USING (status = ''active'' OR app_permission(''courses.manage''))',t); END IF;
  IF t='academic_levels' THEN EXECUTE format('CREATE POLICY catalog_read ON %I FOR SELECT USING (true)',t); END IF;
  EXECUTE format('CREATE POLICY catalog_write ON %I FOR ALL USING(app_permission(''courses.manage'')) WITH CHECK(app_permission(''courses.manage''))',t);
 END LOOP;
END $$;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_read ON profiles FOR SELECT USING(user_id=app_uid() OR app_permission('users.read') OR EXISTS(SELECT 1 FROM enrollments e JOIN course_offerings o ON e.course_offering_id=o.id WHERE e.student_id=user_id AND o.lecturer_id=app_uid()));
CREATE POLICY profile_write ON profiles FOR ALL USING(user_id=app_uid() OR app_permission('users.manage')) WITH CHECK(user_id=app_uid() OR app_permission('users.manage'));
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_read ON enrollments FOR SELECT USING(student_id=app_uid() OR app_permission('users.read') OR EXISTS(SELECT 1 FROM course_offerings o WHERE o.id=course_offering_id AND o.lecturer_id=app_uid()));
CREATE POLICY enrollment_write ON enrollments FOR ALL USING(student_id=app_uid() OR app_permission('courses.manage')) WITH CHECK(student_id=app_uid() OR app_permission('courses.manage'));
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_read ON resources FOR SELECT USING(app_resource(id));
CREATE POLICY resource_write ON resources FOR ALL USING(app_permission('resources.moderate') OR (uploaded_by=app_uid() AND app_permission('resources.write') AND app_teaches(course_id))) WITH CHECK(app_permission('resources.moderate') OR (uploaded_by=app_uid() AND app_permission('resources.write') AND app_teaches(course_id)));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['bookmarks','progress','notes','notifications','ai_conversations','upload_intents'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY own_data ON %I FOR ALL USING(user_id=app_uid()) WITH CHECK(user_id=app_uid())',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['resource_views','resource_downloads'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY activity_read ON %I FOR SELECT USING(user_id=app_uid() OR app_permission(''reports.read'') OR EXISTS(SELECT 1 FROM resources r WHERE r.id=resource_id AND app_teaches(r.course_id)))',t);
  EXECUTE format('CREATE POLICY activity_insert ON %I FOR INSERT WITH CHECK(user_id=app_uid() AND app_resource(resource_id))',t);
 END LOOP;
END $$;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_read ON quizzes FOR SELECT USING(app_permission('courses.manage') OR app_teaches(course_id) OR (status='published' AND app_enrolled(course_id)));
CREATE POLICY quiz_write ON quizzes FOR ALL USING(app_permission('quizzes.write') AND (app_permission('courses.manage') OR app_teaches(course_id))) WITH CHECK(app_permission('quizzes.write') AND (app_permission('courses.manage') OR app_teaches(course_id)));
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY attempts_read ON quiz_attempts FOR SELECT USING(user_id=app_uid() OR app_permission('reports.read') OR EXISTS(SELECT 1 FROM quizzes q WHERE q.id=quiz_id AND app_teaches(q.course_id)));
CREATE POLICY attempts_write ON quiz_attempts FOR ALL USING(user_id=app_uid()) WITH CHECK(user_id=app_uid());
ALTER TABLE quiz_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_author ON quiz_keys FOR ALL USING(app_permission('quizzes.write') AND EXISTS(SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id WHERE qq.id=question_id AND (app_permission('courses.manage') OR app_teaches(q.course_id))));
-- Scoring is accessed only by trusted server SQL. Runtime DB credentials must
-- never be exposed to clients; keys are absent from all general queries.
CREATE FUNCTION app_score_keys(qid uuid) RETURNS TABLE(id uuid,points integer,answer text,explanation text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT q.id,q.points,k.answer,k.explanation FROM quiz_questions q JOIN quiz_keys k ON k.question_id=q.id WHERE q.quiz_id=qid AND (EXISTS(SELECT 1 FROM quiz_attempts a WHERE a.quiz_id=qid AND a.user_id=app_uid()) OR app_permission('quizzes.write')) $$;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcement_read ON announcements FOR SELECT USING(app_permission('courses.manage') OR created_by=app_uid() OR ((status='published' OR (status='scheduled' AND publish_at<=now())) AND (course_id IS NULL OR app_enrolled(course_id) OR app_teaches(course_id)) AND (programme_id IS NULL OR programme_id=(SELECT p.programme_id FROM profiles p WHERE p.user_id=app_uid())) AND (department_id IS NULL OR department_id=(SELECT p.department_id FROM profiles p WHERE p.user_id=app_uid())) AND (level IS NULL OR level=(SELECT p.level FROM profiles p WHERE p.user_id=app_uid()))));
CREATE POLICY announcement_write ON announcements FOR ALL USING(app_permission('announcements.manage') AND (app_permission('courses.manage') OR (created_by=app_uid() AND app_teaches(course_id)))) WITH CHECK(app_permission('announcements.manage') AND (app_permission('courses.manage') OR (created_by=app_uid() AND app_teaches(course_id))));
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_read ON calendar_events FOR SELECT USING(created_by=app_uid() OR visibility='global' OR (visibility='course' AND (app_enrolled(course_id) OR app_teaches(course_id))) OR app_permission('courses.manage'));
CREATE POLICY calendar_write ON calendar_events FOR ALL USING(created_by=app_uid() OR app_permission('courses.manage')) WITH CHECK((created_by=app_uid() AND visibility='private') OR app_permission('courses.manage') OR (created_by=app_uid() AND visibility='course' AND app_teaches(course_id)));
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON audit_logs FOR SELECT USING(app_permission('audit.read'));
CREATE POLICY audit_append ON audit_logs FOR INSERT WITH CHECK(actor_id=app_uid());
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY chunk_read ON document_chunks FOR SELECT USING(app_resource(resource_id));
CREATE POLICY chunk_write ON document_chunks FOR ALL USING(app_permission('resources.write') AND EXISTS(SELECT 1 FROM resources r WHERE r.id=resource_id AND (app_permission('resources.moderate') OR (r.uploaded_by=app_uid() AND app_teaches(r.course_id)))));
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_messages ON ai_messages FOR ALL USING(EXISTS(SELECT 1 FROM ai_conversations c WHERE c.id=conversation_id AND c.user_id=app_uid())) WITH CHECK(EXISTS(SELECT 1 FROM ai_conversations c WHERE c.id=conversation_id AND c.user_id=app_uid()));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['roles','permissions','role_permissions','feature_flags','system_settings'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY configuration_read ON %I FOR SELECT USING(app_uid() IS NOT NULL)',t);
  EXECUTE format('CREATE POLICY configuration_write ON %I FOR ALL USING(app_permission(''system.manage'')) WITH CHECK(app_permission(''system.manage''))',t);
 END LOOP;
END $$;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_access ON reports FOR ALL USING(app_permission('reports.read')) WITH CHECK(app_permission('reports.read'));
ALTER TABLE resource_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_read ON resource_versions FOR SELECT USING(app_resource(resource_id));
CREATE POLICY versions_write ON resource_versions FOR INSERT WITH CHECK(created_by=app_uid() AND app_permission('resources.write'));
-- Force policies on user-facing records even when the app owns a table. Helper
-- tables used by SECURITY DEFINER policies must be owned by the migration role,
-- with a separate non-owner application role in production (see README).
