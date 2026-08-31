DELETE FROM public.observacoes AS observacao
WHERE NOT EXISTS (
  SELECT 1
  FROM public.students AS student
  WHERE student.id = observacao.student_id
);

ALTER TABLE public.observacoes
  DROP CONSTRAINT IF EXISTS observacoes_student_id_fkey,
  ADD CONSTRAINT observacoes_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES public.students(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS observacoes_student_id_idx
  ON public.observacoes(student_id);
