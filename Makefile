
all: 1.svg 2.svg

%.svg: %.py svg.py shape.py
	python3 $< > $@

