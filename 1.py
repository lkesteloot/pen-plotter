
# Inspired by P.2.2.3 of Generative Design
import sys
from svg import *

WIDTH = 8.5*DPI
HEIGHT = 11*DPI
STEP_SIZE = 2

def main():
    f = sys.stdout
    write_header(f, WIDTH, HEIGHT)
    draw_rect(f, 0, 0, WIDTH, HEIGHT)

    X1 = WIDTH*0.1
    X2 = WIDTH*0.9
    POINT_COUNT = 15

    for chunk in range(10):
        v = []
        y = random_in_range(HEIGHT*0.1, HEIGHT*0.9)
        for i in range(POINT_COUNT):
            v.append( (lerp(X1, X2, i/POINT_COUNT), y) )
        dy = random_in_range(-3, 3)
        line_count = int(random_in_range(20, 60))

        for i in range(line_count):
            v = [(x + random_in_range(-STEP_SIZE, STEP_SIZE),
                  y + random_in_range(-STEP_SIZE, STEP_SIZE) + dy) for (x, y) in v]

            draw_spline(f, duplicate_ends(v))

    write_footer(f)

main()

