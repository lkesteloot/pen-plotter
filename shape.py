
# A shape is a list of (x1,y1,x2,y2) line segment tuples, ordered clockwise.

import math
from svg import lerp

def _read_path_string_from_svg(filename):
    s = open(filename).read()
    i = s.find('path d="')
    if i == -1:
        raise Exception("cannot find path in " + filename)
    s = s[i + 8:]
    i = s.find('"')
    if i == -1:
        raise Exception("cannot find end of path in " + filename)
    s = s[:i]
    if s.find('path d="') >= 0:
        raise Exception("multiple paths in " + filename)
    return s

# Returns (token, next_i), or (None, None) at end of string.
def _parse_token(path, i):
    # Skip whitespace and comma.
    while i < len(path) and (path[i].isspace() or path[i] == ","):
        i += 1

    # Check end of string.
    if i == len(path):
        return (None, None)

    # Check movement command.
    ch = path[i]
    if ch.isalpha():
        return (ch, i + 1)

    # Must be number. Ideally Python would parse it and tell us where the
    # parsing ended, but I can't find a way to do that, so just assume it's
    # only the straightforward stuff.
    start = i
    if path[i] == "-":
        i += 1
    while i < len(path) and (path[i] == "." or path[i].isdigit()):
        i += 1
    if start == i:
        raise Exception("can't parse float, next char is " + str(ord(path[i])))
    return (float(path[start:i]), i)

def _add_bezier(lines, x1, y1, x2, y2, x3, y3, x4, y4):
    COUNT = 10
    points = []
    for i in range(COUNT + 1):
        t = i / COUNT

        x12 = lerp(x1, x2, t)
        y12 = lerp(y1, y2, t)
        x23 = lerp(x2, x3, t)
        y23 = lerp(y2, y3, t)
        x34 = lerp(x3, x4, t)
        y34 = lerp(y3, y4, t)

        x123 = lerp(x12, x23, t)
        y123 = lerp(y12, y23, t)
        x234 = lerp(x23, x34, t)
        y234 = lerp(y23, y34, t)

        x1234 = lerp(x123, x234, t)
        y1234 = lerp(y123, y234, t)

        points.append( (x1234, y1234) )

    for i in range(len(points) - 1):
        lines.append( (points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]) )

def _parse_path_to_shape(path):
    lines = []
    initial_point = None
    x = None
    y = None
    # previous handle
    xh = None
    yh = None
    i = 0
    while True:
        is_first = x is None or y is None
        token, i = _parse_token(path, i)
        if token is None:
            break
        elif token == "M":
            x, i = _parse_token(path, i)
            y, i = _parse_token(path, i)
        elif token == "l":
            dx, i = _parse_token(path, i)
            dy, i = _parse_token(path, i)
            x2 = x + dx
            y2 = y + dy
            lines.append( (x, y, x2, y2) )
            x = x2
            y = y2
        elif token == "H":
            x2, i = _parse_token(path, i)
            lines.append( (x, y, x2, y) )
            x = x2
        elif token == "h":
            dx, i = _parse_token(path, i)
            x2 = x + dx
            lines.append( (x, y, x2, y) )
            x = x2
        elif token == "V":
            y2, i = _parse_token(path, i)
            lines.append( (x, y, x, y2) )
            y = y2
        elif token == "v":
            dy, i = _parse_token(path, i)
            y2 = y + dy
            lines.append( (x, y, x, y2) )
            y = y2
        elif token == "c":
            dx2, i = _parse_token(path, i)
            dy2, i = _parse_token(path, i)
            dx3, i = _parse_token(path, i)
            dy3, i = _parse_token(path, i)
            dx4, i = _parse_token(path, i)
            dy4, i = _parse_token(path, i)
            x2 = x + dx2
            y2 = y + dy2
            x3 = x + dx3
            y3 = y + dy3
            x4 = x + dx4
            y4 = y + dy4
            _add_bezier(lines, x, y, x2, y2, x3, y3, x4, y4)
            xh = x3
            yh = y3
            x = x4
            y = y4
        elif token == "s":
            dx3, i = _parse_token(path, i)
            dy3, i = _parse_token(path, i)
            dx4, i = _parse_token(path, i)
            dy4, i = _parse_token(path, i)
            x2 = x + (x - xh)
            y2 = y + (y - yh)
            x3 = x + dx3
            y3 = y + dy3
            x4 = x + dx4
            y4 = y + dy4
            _add_bezier(lines, x, y, x2, y2, x3, y3, x4, y4)
            xh = x3
            yh = y3
            x = x4
            y = y4
        elif token == "z" or token == "Z":
            # Close
            lines.append( (x, y, initial_point[0], initial_point[1]) )
            pass
        else:
            raise Exception("Unknown SVG command " + token)

        if is_first and (x is not None and y is not None):
            initial_point = (x, y)

    return lines

def read_from_svg(filename):
    # Find path in file.
    path = _read_path_string_from_svg(filename)
    return _parse_path_to_shape(path)

def dist_to_shape(x, y, lines):
    closest_dist = None

    for x1, y1, x2, y2 in lines:
        # Normal vector.
        dx = (y1 - y2)
        dy = (x2 - x1)

        # Normalize it.
        length = math.sqrt(dx**2 + dy**2)
        if length <= 0:
            continue
        dx /= length
        dy /= length

        # Dot with line to point.
        dot = dx*(x - x1) + dy*(y - y1)

        # Project back to line.
        px = x - dot*dx
        py = y - dot*dy

        # Find distance along line.
        if abs(x2 - x1) > abs(y2 - y1):
            t = (x - x1)/(x2 - x1)
        else:
            t = (y - y1)/(y2 - y1)

        # Clamp to line.
        t = max(min(t, 1), 0)

        # Put back on line.
        px = lerp(x1, x2, t)
        py = lerp(y1, y2, t)

        # Find distance.
        dist = math.sqrt((x - px)**2 + (y - py)**2)

        # Copy sign from dot product.
        dist = math.copysign(dist, dot)

        if closest_dist is None or abs(dist) < abs(closest_dist):
            closest_dist = dist

    return closest_dist

# Returns (min_x, min_y, max_x, max_y)
def get_bbox(lines):
    bbox = [lines[0][0], lines[0][1], lines[0][0], lines[0][1]]

    for x1, y1, x2, y2 in lines:
        bbox[0] = min(bbox[0], x1, x2)
        bbox[1] = min(bbox[1], y1, y2)
        bbox[2] = max(bbox[2], x1, x2)
        bbox[3] = max(bbox[3], y1, y2)

    return tuple(bbox)

def translate_by(lines, dx, dy):
    return [(x1 + dx, y1 + dy, x2 + dx, y2 + dy) for x1, y1, x2, y2 in lines]

def scale_by(lines, sx, sy):
    return [(x1 * sx, y1 * sy, x2 * sx, y2 * sy) for x1, y1, x2, y2 in lines]

def center_in(lines, x1, y1, x2, y2):
    bbox = get_bbox(lines)

    sx = (x2 - x1) / (bbox[2] - bbox[0])
    sy = (y2 - y1) / (bbox[3] - bbox[1])
    s = min(sx, sy)

    lines = translate_by(lines, -(bbox[0] + bbox[2])/2, -(bbox[1] + bbox[3])/2)
    lines = scale_by(lines, s, s)
    lines = translate_by(lines, (x1 + x2)/2, (y1 + y2)/2)

    return lines

if __name__ == "__main__":
    lines = read_from_svg("E.svg")
    for line in lines:
        print(line)


