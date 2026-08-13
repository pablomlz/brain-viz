# Construye las diapositivas y el guion de la defensa.
#   make            los dos
#   make diapositivas
#   make guion

# En macOS con BasicTeX los binarios están en /Library/TeX/texbin, que no
# siempre entra en el PATH de la terminal.
PATH := /Library/TeX/texbin:$(PATH)

PDFLATEX ?= $(or $(shell command -v pdflatex 2>/dev/null),/Library/TeX/texbin/pdflatex)

all: diapositivas guion

diapositivas: presentacion.pdf
guion: guion.pdf

# Dos pasadas: la primera deja el total de páginas y las referencias, la
# segunda las coloca bien.
%.pdf: %.tex FORCE
	$(PDFLATEX) -interaction=nonstopmode $< > /dev/null
	$(PDFLATEX) -interaction=nonstopmode $< > /dev/null
	@echo "$@ listo"

limpiar:
	rm -f *.aux *.log *.nav *.out *.snm *.toc *.vrb

FORCE:
.PHONY: all diapositivas guion limpiar FORCE
