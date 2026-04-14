
CREATE POLICY "School responsavel can update survey responses"
ON public.survey_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM students
    JOIN classes ON classes.id = students.class_id
    JOIN schools ON schools.id = classes.school_id
    WHERE students.id = survey_responses.student_id
    AND schools.responsavel_id = auth.uid()
  )
);
