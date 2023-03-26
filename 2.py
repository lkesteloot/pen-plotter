
# Inspired by P.2.2.5 of Generative Design
import sys, math
from svg import *
import shape

WIDTH = 8.5*DPI
HEIGHT = 11*DPI
MARGIN = 0*DPI
MAX_RADIUS = 0.5*DPI

def add_circle(circles, bounding_shape):
    for attempt in range(1000):
        x = random_in_range(MARGIN, WIDTH - MARGIN)
        y = random_in_range(MARGIN, HEIGHT - MARGIN)

        min_dist = MAX_RADIUS

        # Rectangle:
        #min_dist = min(min_dist, x - MARGIN, y - MARGIN, WIDTH - MARGIN - x, HEIGHT - MARGIN - y)

        # Circle:
        #R = min(WIDTH - MARGIN*2, HEIGHT - MARGIN*2) / 2
        #r2 = (x - WIDTH/2)**2 + (y - HEIGHT/2)**2
        #if r2 > R*R:
        #    continue
        #min_dist = min(min_dist, R - math.sqrt(r2))

        # Shape:
        dist = shape.dist_to_shape(x, y, bounding_shape)
        if dist <= 0:
            continue
        min_dist = min(min_dist, dist)

        for c in circles:
            dist2 = (x - c[0])**2 + (y - c[1])**2
            if dist2 <= c[2]**2:
                break
            dist = math.sqrt(dist2) - c[2]
            if dist < min_dist:
                min_dist = dist
        else:
            circles.append( (x, y, min_dist) )
            return True

    return False

def main():
    dx = -580
    dy = -350
    s = 0.6
    letter = shape.read_from_svg("E.svg")
    letter = [((x1 + dx)*s, (y1 + dy)*s, (x2 + dx)*s, (y2 + dy)*s) for x1, y1, x2, y2 in letter]

    circles = []

    while len(circles) < 1000:
        succeeded = add_circle(circles, letter)
        if not succeeded:
            break

    f = sys.stdout
    write_header(f, WIDTH, HEIGHT)
    draw_rect(f, 0, 0, WIDTH, HEIGHT)

    if False:
        for x1, y1, x2, y2 in letter:
            draw_line(f, x1, y1, x2, y2)

    for c in circles:
        draw_circle(f, c[0], c[1], c[2])

    write_footer(f)

main()
