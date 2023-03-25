
all: 1.svg

%.svg: %.py
	python3 $^ > $@

