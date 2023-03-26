
# Inspired by P.2.2.5 of Generative Design
import sys, math

from svg import *
import shape

WIDTH = 8.5*DPI
HEIGHT = 11*DPI
WIDTH, HEIGHT = HEIGHT, WIDTH  # Landscape
MARGIN = 1*DPI
MAX_RADIUS = 0.5*DPI

def add_circle(circles, bounding_shapes):
    for attempt in range(1000):
        x = random_in_range(0, WIDTH)
        y = random_in_range(0, HEIGHT)

        min_dist = MAX_RADIUS

        for bounding_shape in bounding_shapes:
            dist = shape.dist_to_shape(x, y, bounding_shape)
            if dist > 0:
                min_dist = min(min_dist, dist)
                break
        else:
            # Outside all shapes.
            continue

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
    bounding_shapes = []
    letter = shape.letter_from_font("L", "/Library/Fonts/AGaramondPro-Regular.otf")
    letter = shape.center_in(letter, MARGIN, MARGIN, WIDTH/2 - MARGIN/2, HEIGHT - MARGIN)
    bounding_shapes.append(letter)
    letter = shape.letter_from_font("K", "/Library/Fonts/AGaramondPro-Regular.otf")
    letter = shape.center_in(letter, WIDTH/2 + MARGIN/2, MARGIN, WIDTH - MARGIN, HEIGHT - MARGIN)
    bounding_shapes.append(letter)

    circles = []

    while len(circles) < 100 and True:
        succeeded = add_circle(circles, bounding_shapes)
        if not succeeded:
            break

    f = sys.stdout
    write_header(f, WIDTH, HEIGHT)
    #draw_rect(f, 0, 0, WIDTH, HEIGHT)

    if True:
        for bounding_shape in bounding_shapes:
            for x1, y1, x2, y2 in bounding_shape:
                draw_line(f, x1, y1, x2, y2)

    for c in circles:
        draw_circle(f, c[0], c[1], c[2])

    write_footer(f)

main()
