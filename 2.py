
# Inspired by P.2.2.5 of Generative Design
import sys, math
from svg import *

WIDTH = 8.5*DPI
HEIGHT = 11*DPI
MARGIN = 1*DPI
MAX_RADIUS = 0.5*DPI

def add_circle(circles):
    for attempt in range(100):
        x = random_in_range(MARGIN, WIDTH - MARGIN)
        y = random_in_range(MARGIN, HEIGHT - MARGIN)

        min_dist = min(MAX_RADIUS, x - MARGIN, y - MARGIN, WIDTH - MARGIN - x, HEIGHT - MARGIN - y)
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
    circles = []

    while len(circles) < 5000:
        succeeded = add_circle(circles)
        if not succeeded:
            break

    f = sys.stdout
    write_header(f, WIDTH, HEIGHT)
    draw_rect(f, 0, 0, WIDTH, HEIGHT)

    for c in circles:
        draw_circle(f, c[0], c[1], c[2])

    write_footer(f)

main()
