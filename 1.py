
import sys
import random

DPI = 72
WIDTH = 8.5*DPI
HEIGHT = 11*DPI
CURVE_TIGHTNESS = 0 # 0 = Catmull-Rom splines, 1 = straight lines
STEP_SIZE = 2

def write_header(f):
    global WIDTH, HEIGHT
    f.write("""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="%g" height="%g" viewBox="0 0 %g %g" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
""" % (WIDTH, HEIGHT, WIDTH, HEIGHT))

def draw_line(f, x1, y1, x2, y2):
    f.write("""<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="blue" stroke-width="1"/>
""" %
            (x1, y1, x2, y2))

def draw_rect(f, x1, y1, x2, y2):
    f.write("""<rect x="%g" y="%g" width="%g" height="%g" stroke="blue" stroke-width="1" fill="none"/>
""" %
            (x1, y1, x2 - x1, y2 - y1))

def draw_spline(f, v):
    s = 1 - CURVE_TIGHTNESS
    for i in range(1, len(v) - 2):
        b0 = v[i]
        b1 = (
          v[i][0] + (s * v[i + 1][0] - s * v[i - 1][0]) / 6,
          v[i][1] + (s * v[i + 1][1] - s * v[i - 1][1]) / 6
        )
        b2 = (
          v[i + 1][0] + (s * v[i][0] - s * v[i + 2][0]) / 6,
          v[i + 1][1] + (s * v[i][1] - s * v[i + 2][1]) / 6
        )
        b3 = v[i + 1]
        #draw_line(f, b0[0], b0[1], b1[0], b1[1])
        #draw_line(f, b1[0], b1[1], b2[0], b2[1])
        #draw_line(f, b2[0], b2[1], b3[0], b3[1])
        f.write("""<path d="M %g %g C %g %g, %g %g, %g %g" stroke="black" stroke-width="1" fill="none"/>
""" %
                (b0[0], b0[1], b1[0], b1[1], b2[0], b2[1], b3[0], b3[1]))

def write_footer(f):
    f.write("""</svg>
""")

def lerp(a, b, t):
    return a + (b - a)*t

def duplicate_ends(v):
    return [v[0]] + v + [v[-1]]

def random_in_range(a, b):
    return lerp(a, b, random.random())

def main():
    f = sys.stdout
    write_header(f)
    draw_rect(f, 0, 0, WIDTH, HEIGHT)

    x1 = WIDTH*0.1
    x2 = WIDTH*0.9
    COUNT = 15

    for chunk in range(5):
        v = []
        y = random_in_range(HEIGHT*0.1, HEIGHT*0.9)
        for i in range(COUNT):
            v.append( (lerp(x1, x2, i/COUNT), y) )
        dy = 3 if random.random() > 0.5 else -3
        line_count = int(random_in_range(20, 40))

        for i in range(line_count):
            v = [(x + random_in_range(-STEP_SIZE, STEP_SIZE),
                  y + random_in_range(-STEP_SIZE, STEP_SIZE) + dy) for (x, y) in v]

            draw_spline(f, duplicate_ends(v))

    write_footer(f)

main()

