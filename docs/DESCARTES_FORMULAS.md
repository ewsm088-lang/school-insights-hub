# Modelo Descartes — Fórmulas

As fórmulas abaixo representam o modelo implementado em `src/lib/descartes.ts`.

**Acadêmico**
$$
A_i = \max\left\{0,\ \min\left\{1,\ \frac{N_i - N_{\min}}{N_{\max} - N_{\min}}\right\}\right\}
$$

**Social** (média das 20 respostas S1–S20, normalizada 0–1)
$$
S = \frac{\overline{s} - 1}{4},\quad \overline{s}=\frac{1}{20}\sum_{k=1}^{20}s_k
$$

**Socioemocional** (média das 20 respostas E1–E20, normalizada 0–1)
$$
E = \frac{\overline{e} - 1}{4},\quad \overline{e}=\frac{1}{20}\sum_{k=1}^{20}e_k
$$

**Módulo do VDI**
$$
|\mathrm{VDI}| = \begin{cases}
\sqrt{A^2 + S^2 + E^2}, & \text{se }A\text{ disponível} \\
\sqrt{S^2 + E^2}, & \text{se }A\text{ indisponível}
\end{cases}
$$

**IEDE (média dos |VDI| da escola)**
$$
{\rm IEDE} = \frac{1}{n}\sum_{i=1}^{n}|{\rm VDI}_i|
$$

**Desvio padrão (dos |VDI|)**
$$
\sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}\big(|{\rm VDI}_i| - {\rm IEDE}\big)^2}
$$

**Correlação de Pearson**
$$
r = \frac{\sum_{i=1}^{n}(x_i-\overline{x})(y_i-\overline{y})}{\sqrt{\sum_{i=1}^{n}(x_i-\overline{x})^2}\,\sqrt{\sum_{i=1}^{n}(y_i-\overline{y})^2}}
$$

**Classificações**
- `iede`:
  - Alto: $iede\ge 0.7$
  - Intermediário: $0.4 \le iede < 0.7$
  - Baixo: $iede < 0.4$
- `|VDI|` do aluno:
  - vulnerável: $|{\rm VDI}| < 0.58$
  - parcial: $0.58 \le |{\rm VDI}| < 1.15$
  - integrado: $|{\rm VDI}| \ge 1.15$

**Limite teórico**
$$
|{\rm VDI}|_{\max} = \sqrt{3} \quad(\text{quando }A=S=E=1)
$$

**Subdimensões**
Para uma subdimensão com $m$ itens $q_1,\dots,q_m$:
$$
D = \frac{\overline{q} - 1}{4},\quad \overline{q}=\frac{1}{m}\sum_{j=1}^m q_j
$$

---

Se quiser, gero também um PDF ou incluo este conteúdo na documentação do projeto.
