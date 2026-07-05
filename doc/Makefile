DOC := proyecto.tex

# En macOS con BasicTeX, los binarios suelen vivir en /Library/TeX/texbin.
# Esto evita errores tipo "pdflatex: command not found" en shells sin esa ruta.
PATH := /Library/TeX/texbin:$(PATH)

PDFLATEX ?= $(or $(shell command -v pdflatex 2>/dev/null),/Library/TeX/texbin/pdflatex)
BIBTEX ?= $(or $(shell command -v bibtex 2>/dev/null),/Library/TeX/texbin/bibtex)

all: doc

doc: $(DOC:.tex=.pdf)

all: proyecto.pdf

%.pdf: %.tex FORCE
	$(PDFLATEX) $< && $(BIBTEX) $* && $(PDFLATEX) $< && $(PDFLATEX) $<

FORCE: 


