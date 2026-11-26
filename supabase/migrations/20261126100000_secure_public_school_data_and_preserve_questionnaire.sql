-- Remove direct anonymous table access. Public forms use narrowly scoped RPCs below.
REVOKE ALL ON TABLE
  public.credes,
  public.schools,
  public.classes,
  public.students,
  public.academic_data,
  public.survey_responses,
  public.observacoes
FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.credes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.schools,
  public.classes,
  public.students,
  public.academic_data,
  public.survey_responses,
  public.observacoes
TO authenticated;

-- Pin the role helper's search path and limit who can call it.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Signed-in users can read only their school; admins retain system-wide access.
DROP POLICY IF EXISTS "Anyone authenticated can view credes" ON public.credes;
DROP POLICY IF EXISTS "Anyone can view credes" ON public.credes;
CREATE POLICY "Authenticated users can view credes"
  ON public.credes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
CREATE POLICY "School responsible or admin can view schools"
  ON public.schools FOR SELECT TO authenticated
  USING (
    responsavel_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
CREATE POLICY "School responsible or admin can view classes"
  ON public.classes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.schools
      WHERE schools.id = classes.school_id
        AND schools.responsavel_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view students" ON public.students;
DROP POLICY IF EXISTS "Public can insert students for survey" ON public.students;
CREATE POLICY "School responsible or admin can view students"
  ON public.students FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.classes
      JOIN public.schools ON schools.id = classes.school_id
      WHERE classes.id = students.class_id
        AND schools.responsavel_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view academic data" ON public.academic_data;
CREATE POLICY "School responsible or admin can view academic data"
  ON public.academic_data FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      JOIN public.schools ON schools.id = classes.school_id
      WHERE students.id = academic_data.student_id
        AND schools.responsavel_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Public can submit survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated can submit survey responses" ON public.survey_responses;
CREATE POLICY "School responsible or admin can view survey responses"
  ON public.survey_responses FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      JOIN public.schools ON schools.id = classes.school_id
      WHERE students.id = survey_responses.student_id
        AND schools.responsavel_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view observacoes" ON public.observacoes;
CREATE POLICY "School responsible or admin can view observacoes"
  ON public.observacoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      JOIN public.schools ON schools.id = classes.school_id
      WHERE students.id = observacoes.student_id
        AND schools.responsavel_id = auth.uid()
    )
  );

-- These catalog RPCs expose only the fields required by anonymous forms.
CREATE OR REPLACE FUNCTION public.list_public_credes()
RETURNS TABLE (id UUID, numero INTEGER, nome TEXT, cidade_sede TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.numero, c.nome, c.cidade_sede
  FROM public.credes AS c
  ORDER BY c.numero
$$;

CREATE OR REPLACE FUNCTION public.list_public_schools(
  p_crede_id UUID DEFAULT NULL,
  p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, nome TEXT, crede_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.nome, s.crede_id
  FROM public.schools AS s
  WHERE (p_crede_id IS NULL OR s.crede_id = p_crede_id)
    AND (p_school_id IS NULL OR s.id = p_school_id)
  ORDER BY s.nome
$$;

CREATE OR REPLACE FUNCTION public.list_public_classes(p_school_id UUID)
RETURNS TABLE (id UUID, nome_turma TEXT, serie TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.nome_turma, c.serie
  FROM public.classes AS c
  WHERE c.school_id = p_school_id
  ORDER BY c.serie, c.nome_turma
$$;

REVOKE ALL ON FUNCTION public.list_public_credes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_public_schools(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_public_classes(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_credes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_schools(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_classes(UUID) TO anon, authenticated;

-- Submit a questionnaire in one transaction without exposing student rows.
CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_class_id UUID,
  p_codigo_aluno TEXT,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_student_id UUID;
  v_expected_keys CONSTANT TEXT[] := ARRAY[
    's01','s02','s03','s04','s05','s06','s07','s08','s09','s10',
    's11','s12','s13','s14','s15','s16','s17','s18','s19','s20',
    'e01','e02','e03','e04','e05','e06','e07','e08','e09','e10',
    'e11','e12','e13','e14','e15','e16','e17','e18','e19','e20'
  ];
BEGIN
  v_code := pg_catalog.btrim(p_codigo_aluno);
  IF p_class_id IS NULL
    OR v_code IS NULL
    OR v_code !~ '^[0-9A-Za-z/-]{1,20}$'
    OR p_answers IS NULL
    OR pg_catalog.jsonb_typeof(p_answers) IS DISTINCT FROM 'object'
  THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes AS c WHERE c.id = p_class_id
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF (p_answers - v_expected_keys) <> '{}'::JSONB
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(v_expected_keys) AS required(key)
      WHERE pg_catalog.jsonb_typeof(p_answers -> required.key) IS DISTINCT FROM 'number'
        OR (p_answers ->> required.key) !~ '^[1-5]$'
    )
  THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_class_id::TEXT || ':' || pg_catalog.lower(v_code),
      0
    )
  );

  -- Return the same success response for repeat submissions, without revealing
  -- whether a student code has already submitted a questionnaire.
  IF EXISTS (
    SELECT 1
    FROM public.students AS s
    JOIN public.survey_responses AS r ON r.student_id = s.id
    WHERE s.class_id = p_class_id
      AND pg_catalog.lower(s.codigo_aluno) = pg_catalog.lower(v_code)
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', true);
  END IF;

  SELECT s.id
  INTO v_student_id
  FROM public.students AS s
  WHERE s.class_id = p_class_id
    AND pg_catalog.lower(s.codigo_aluno) = pg_catalog.lower(v_code)
  ORDER BY s.created_at, s.id
  LIMIT 1
  FOR UPDATE;

  IF v_student_id IS NULL THEN
    INSERT INTO public.students (class_id, codigo_aluno, nome)
    VALUES (p_class_id, v_code, NULL)
    RETURNING id INTO v_student_id;
  END IF;

  INSERT INTO public.survey_responses (
    student_id,
    s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,
    s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,
    e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,
    e11,e12,e13,e14,e15,e16,e17,e18,e19,e20
  )
  VALUES (
    v_student_id,
    (p_answers->>'s01')::INTEGER,(p_answers->>'s02')::INTEGER,
    (p_answers->>'s03')::INTEGER,(p_answers->>'s04')::INTEGER,
    (p_answers->>'s05')::INTEGER,(p_answers->>'s06')::INTEGER,
    (p_answers->>'s07')::INTEGER,(p_answers->>'s08')::INTEGER,
    (p_answers->>'s09')::INTEGER,(p_answers->>'s10')::INTEGER,
    (p_answers->>'s11')::INTEGER,(p_answers->>'s12')::INTEGER,
    (p_answers->>'s13')::INTEGER,(p_answers->>'s14')::INTEGER,
    (p_answers->>'s15')::INTEGER,(p_answers->>'s16')::INTEGER,
    (p_answers->>'s17')::INTEGER,(p_answers->>'s18')::INTEGER,
    (p_answers->>'s19')::INTEGER,(p_answers->>'s20')::INTEGER,
    (p_answers->>'e01')::INTEGER,(p_answers->>'e02')::INTEGER,
    (p_answers->>'e03')::INTEGER,(p_answers->>'e04')::INTEGER,
    (p_answers->>'e05')::INTEGER,(p_answers->>'e06')::INTEGER,
    (p_answers->>'e07')::INTEGER,(p_answers->>'e08')::INTEGER,
    (p_answers->>'e09')::INTEGER,(p_answers->>'e10')::INTEGER,
    (p_answers->>'e11')::INTEGER,(p_answers->>'e12')::INTEGER,
    (p_answers->>'e13')::INTEGER,(p_answers->>'e14')::INTEGER,
    (p_answers->>'e15')::INTEGER,(p_answers->>'e16')::INTEGER,
    (p_answers->>'e17')::INTEGER,(p_answers->>'e18')::INTEGER,
    (p_answers->>'e19')::INTEGER,(p_answers->>'e20')::INTEGER
  );

  RETURN pg_catalog.jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN pg_catalog.jsonb_build_object('ok', true);
  WHEN OTHERS THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'submission_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.submit_survey_response(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(UUID, TEXT, JSONB) TO anon, authenticated;

COMMENT ON FUNCTION public.list_public_credes() IS
  'Public questionnaire catalog. Returns only CREDE labels and IDs.';
COMMENT ON FUNCTION public.list_public_schools(UUID, UUID) IS
  'Public questionnaire catalog. Returns only school ID, name, and CREDE ID.';
COMMENT ON FUNCTION public.list_public_classes(UUID) IS
  'Public questionnaire catalog. Returns only class ID, name, and series for one school.';
COMMENT ON FUNCTION public.submit_survey_response(UUID, TEXT, JSONB) IS
  'Validates and records one public questionnaire without exposing student rows.';
