ALTER TABLE public.survey_responses DROP CONSTRAINT survey_responses_student_id_fkey,
  ADD CONSTRAINT survey_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.academic_data DROP CONSTRAINT academic_data_student_id_fkey,
  ADD CONSTRAINT academic_data_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

GRANT DELETE ON public.students TO authenticated;

CREATE POLICY "School responsavel can delete students"
ON public.students FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.classes
  JOIN public.schools ON schools.id = classes.school_id
  WHERE classes.id = students.class_id AND schools.responsavel_id = auth.uid()
));

CREATE POLICY "School responsavel can delete academic data"
ON public.academic_data FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students
  JOIN public.classes ON classes.id = students.class_id
  JOIN public.schools ON schools.id = classes.school_id
  WHERE students.id = academic_data.student_id AND schools.responsavel_id = auth.uid()
));

CREATE POLICY "School responsavel can delete survey responses"
ON public.survey_responses FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students
  JOIN public.classes ON classes.id = students.class_id
  JOIN public.schools ON schools.id = classes.school_id
  WHERE students.id = survey_responses.student_id AND schools.responsavel_id = auth.uid()
));