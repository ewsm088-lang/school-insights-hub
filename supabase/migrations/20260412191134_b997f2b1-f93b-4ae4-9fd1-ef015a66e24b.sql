
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'school_responsible');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- CREDEs table
CREATE TABLE public.credes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cidade_sede TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view credes" ON public.credes
  FOR SELECT TO authenticated USING (true);

-- Schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crede_id UUID REFERENCES public.credes(id) NOT NULL,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schools" ON public.schools
  FOR SELECT USING (true);

CREATE POLICY "School responsavel can update their school" ON public.schools
  FOR UPDATE USING (auth.uid() = responsavel_id);

CREATE POLICY "Authenticated users can create schools" ON public.schools
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = responsavel_id);

-- Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  nome_turma TEXT NOT NULL,
  serie TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "School responsavel can manage classes" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_id AND schools.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "School responsavel can update classes" ON public.classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_id AND schools.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "School responsavel can delete classes" ON public.classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_id AND schools.responsavel_id = auth.uid()
    )
  );

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  codigo_aluno TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view students" ON public.students
  FOR SELECT USING (true);

CREATE POLICY "School responsavel can manage students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      JOIN public.schools ON schools.id = classes.school_id
      WHERE classes.id = class_id AND schools.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "School responsavel can update students" ON public.students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.classes
      JOIN public.schools ON schools.id = classes.school_id
      WHERE classes.id = class_id AND schools.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert students for survey" ON public.students
  FOR INSERT TO anon WITH CHECK (true);

-- Academic data table
CREATE TABLE public.academic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nota NUMERIC(5,2) NOT NULL,
  nota_min NUMERIC(5,2) NOT NULL DEFAULT 0,
  nota_max NUMERIC(5,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view academic data" ON public.academic_data
  FOR SELECT USING (true);

CREATE POLICY "School responsavel can manage academic data" ON public.academic_data
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      JOIN public.schools ON schools.id = classes.school_id
      WHERE students.id = student_id AND schools.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "School responsavel can update academic data" ON public.academic_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      JOIN public.schools ON schools.id = classes.school_id
      WHERE students.id = student_id AND schools.responsavel_id = auth.uid()
    )
  );

-- Survey responses table (Likert 1-5)
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  participacao INTEGER NOT NULL CHECK (participacao BETWEEN 1 AND 5),
  respeito INTEGER NOT NULL CHECK (respeito BETWEEN 1 AND 5),
  colaboracao INTEGER NOT NULL CHECK (colaboracao BETWEEN 1 AND 5),
  autogestao INTEGER NOT NULL CHECK (autogestao BETWEEN 1 AND 5),
  empatia INTEGER NOT NULL CHECK (empatia BETWEEN 1 AND 5),
  resolucao_conflitos INTEGER NOT NULL CHECK (resolucao_conflitos BETWEEN 1 AND 5),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view survey responses" ON public.survey_responses
  FOR SELECT USING (true);

CREATE POLICY "Public can submit survey responses" ON public.survey_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can submit survey responses" ON public.survey_responses
  FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_data_updated_at
  BEFORE UPDATE ON public.academic_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
