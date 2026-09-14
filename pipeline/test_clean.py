from clean import convert_latex_to_text, normalize_whitespace, parse_authors, parse_doi, remove_html_tags


def test_convert_latext_to_text():

    # Example 1: Title w/ LaTeX symbols
    title1 = "From dyadic $\\Lambda_{\\alpha}$ to $\\Lambda_{\\alpha}$"
    assert convert_latex_to_text(title1) == "From dyadic Λα to Λα"

    title2 = "Reparametrization Invariance, the controversial extraction of $\\alpha$   from $B\\to\\pi\\pi$ and New Physics"
    cleaned_title2 = convert_latex_to_text(title2)
    assert (
        cleaned_title2
        == "Reparametrization Invariance, the controversial extraction of α from B→ππ and New Physics"
    )

    # Example 2: LaTeX subscript
    subscript1 = "X_{total}"
    assert convert_latex_to_text(subscript1) == "X total"

    # Example 3: LaTeX caret
    caret1 = "X^{2}"
    assert convert_latex_to_text(caret1) == "X^2"
    caret2 = "X^{2y-x}"
    assert convert_latex_to_text(caret2) == "X^2y-x"

    # Example 4: Abstract text with LaTeX
    abstract1 = (
        "  In this paper we show how to compute the $\\Lambda_{\\alpha}$ norm, $\\alpha\\ge\n0$, "
        " using the dyadic grid."
        " This result is a consequence of the description of\nthe Hardy spaces $H^p(R^N)$"
        " in terms of dyadic and special atoms.\n"
    )
    cleaned_abstract1 = convert_latex_to_text(abstract1)

    # Check if leading and trailing whitespace is removed
    assert cleaned_abstract1[0] == "I"
    assert cleaned_abstract1[-1] == "."

    assert "H^p(R^N)" in cleaned_abstract1
    assert "Λα norm, α≥0" in cleaned_abstract1

    # Example 5: Remove newline character between characters in the partial abstract text from 0704.0004
    abstract2 = "We show that a determinant of Stirling cycle numbers counts unlabeled acyclic\nsingle-source automata."
    cleaned_abstract2 = convert_latex_to_text(abstract2)
    assert (
        "We show that a determinant of Stirling cycle numbers counts unlabeled acyclic single-source automata."
        in cleaned_abstract2
    )

    # Example 6: LaTeX formulas
    formula1 = "$W^{1}_{p,V}$" # both caret and subscript
    assert convert_latex_to_text(formula1) == "W^1p,V"

    formula2 = "$LP^\#$"
    assert convert_latex_to_text(formula2) == "LP^#"


def test_parse_authors():

    # Example 1: Authors with accented letters
    authors1 = "C. Bal\\'azs, E. L. Berger, P. M. Nadolsky, C.-P. Yuan"
    authors1_clean = parse_authors(authors=authors1)

    assert len(authors1_clean) == 4
    assert authors1_clean[0] == "C. Balázs"
    assert authors1_clean[1] == "E. L. Berger"
    assert authors1_clean[2] == "P. M. Nadolsky"
    assert authors1_clean[3] == "C.-P. Yuan"

    authors2 = (
        "Rastislav \\v{S}r\\'amek, Bro\\v{n}a Brejov\\'a, Tom\\'a\\v{s} Vina\\v{r}"
    )
    authors2_clean = parse_authors(authors=authors2)

    assert len(authors2_clean) == 3
    assert authors2_clean[0] == "Rastislav Šrámek"
    assert authors2_clean[1] == "Broňa Brejová"
    assert authors2_clean[2] == "Tomáš Vinař"

    # Example 2: "and" in the authors string
    authors3 = "Ileana Streinu and Louis Theran"
    authors3_clean = parse_authors(authors=authors3)
    assert len(authors3_clean) == 2
    assert authors3_clean[0] == "Ileana Streinu"
    assert authors3_clean[1] == "Louis Theran"

    # Example 3: both "and" and "," delimiter in the authors string
    authors4 = "A. Esteban-Pretel, R. Tom\\`as and J. W. F. Valle"
    authors4_clean = parse_authors(authors=authors4)

    assert len(authors4_clean) == 3
    assert authors4_clean[0] == "A. Esteban-Pretel"
    assert authors4_clean[1] == "R. Tomàs"
    assert authors4_clean[2] == "J. W. F. Valle"


def test_parse_doi():

    doi1 = "10.1364/JOSAA.23.002578 10.1364/JOSAA.32.002407"
    doi1_clean = parse_doi(doi=doi1)

    assert len(doi1_clean) == 2
    assert doi1_clean[0] == "10.1364/JOSAA.23.002578"
    assert doi1_clean[1] == "10.1364/JOSAA.32.002407"

    # Dealing with newline character and multiple whitespaces
    doi2 = "10.1103/PhysRevD.75.124007 10.1103/PhysRevD.82.029901\n  10.1103/PhysRevD.82.129903"
    doi2_clean = parse_doi(doi=doi2)
    assert len(doi2_clean) == 3
    assert doi2_clean[0] == "10.1103/PhysRevD.75.124007"
    assert doi2_clean[1] == "10.1103/PhysRevD.82.029901"
    assert doi2_clean[2] == "10.1103/PhysRevD.82.129903"


def test_remove_html_tags():

    # Example 1: Title w/ <br> tag
    title1 = "Interactive Small-Step Algorithms II: Abstract State Machines and   the<br> Characterization Theorem"
    title1_removed_html = remove_html_tags(text=title1)
    normalized_title1 = normalize_whitespace(text=title1_removed_html)

    assert normalized_title1 == "Interactive Small-Step Algorithms II: Abstract State Machines and the Characterization Theorem"

    # Example 2: Title w/ non-HTML tags (must not be removed)
    title2 = "The Ly<alpha> and Ly<beta> profiles in solar prominences and prominence   fine structure"
    title2_removed_html = remove_html_tags(text=title2)
    normalized_title2 = normalize_whitespace(text=title2_removed_html)

    assert normalized_title2 == "The Ly<alpha> and Ly<beta> profiles in solar prominences and prominence fine structure"