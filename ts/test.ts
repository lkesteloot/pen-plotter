
import opentype from  "https://unpkg.com/opentype.js@1.3.4/dist/opentype.module.js";
import { Vector } from "./Vector.ts";
import { DPI, Svg } from "./Svg.ts";
import { Rect } from "./Rect.ts";
import { Line } from "./Line.ts";

/**
 * An arbitrary closed shape, ordered counter-clockwise to include and clockwise to exclude.
 */
class Shape {
    public readonly lines: Line[];

    constructor(lines?: Line[]) {
        this.lines = lines ?? [];
    }

    /**
     * Add a Bezier curve to the shape. The curve is broken down into line segments.
     */
    public addBezier(p1: Vector, p2: Vector, p3: Vector, p4: Vector) {
        const COUNT = 10;
        const points: Vector[] = [];

        for (let i = 0; i < COUNT + 1; i++) {
            const t = i/COUNT;

            const p12 = p1.lerp(p2, t);
            const p23 = p2.lerp(p3, t);
            const p34 = p3.lerp(p4, t);

            const p123 = p12.lerp(p23, t);
            const p234 = p23.lerp(p34, t);

            const p1234 = p123.lerp(p234, t);
            
            points.push(p1234);
        }

        for (let i = 0; i < points.length - 1; i++) {
            this.lines.push(new Line(points[i], points[i + 1]));
        }
    }

    /**
     * Computes the bounding box of the shape.
     */
    public getBbox(): Rect {
        let x1 = this.lines[0].p1.x;
        let y1 = this.lines[0].p1.y;
        let x2 = this.lines[0].p1.x;
        let y2 = this.lines[0].p1.y;

        for (const line of this.lines) {
            x1 = Math.min(x1, line.p1.x, line.p2.x);
            y1 = Math.min(y1, line.p1.y, line.p2.y);
            x2 = Math.max(x2, line.p1.x, line.p2.x);
            y2 = Math.max(y2, line.p1.y, line.p2.y);
        }

        const p1 = new Vector(x1, y1);
        const p2 = new Vector(x2, y2);

        return Rect.fromEnds(p1, p2);
    }

    /**
     * Move the shape by the specified vector.
     */
    public translateBy(p: Vector): Shape {
        return new Shape(this.lines.map(line => line.translateBy(p)));
    }

    /**
     * Scale the shape by the specified vector (piece-wise) or scalar.
     */
    public scaleBy(s: number | Vector): Shape {
        return new Shape(this.lines.map(line => line.scaleBy(s)));
    }

    /**
     * Center this shape in the specified rectangle. The new location is the
     * original shape as large as it can by while fully fitting in the rectangle.
     */
    public centerIn(rect: Rect): Shape {
        const bbox = this.getBbox();
        const scaleBoth = rect.size.dividedBy(bbox.size);
        const scale = Math.min(scaleBoth.x, scaleBoth.y);

        return this
            .translateBy(bbox.center().negate())
            .scaleBy(scale)
            .translateBy(rect.center());
    }

    /**
     * Whether the specified point is inside the shape. If the shape overlaps itself, the
     * point is considered inside if it's inside an odd number of lines.
     */
    public isInside(p: Vector): boolean {
        let inside = false;

        // In this algorithm we shoot a ray to the right (positive X) and
        // see how many line segments we intersect with. If the number is
        // odd, we're inside.
        for (const line of this.lines) {
            // See if our point overlaps vertically with this line segment.
            if ((line.p1.y < p.y && p.y <= line.p2.y) || (line.p2.y < p.y && p.y <= line.p1.y)) {
                // Find the intersection between our ray and this line.
                const p12 = line.p2.minus(line.p1);
                const p1r = p.minus(line.p1);
                const t = p12.x*p1r.y/p12.y - p1r.x;
                // See if the intersection is to the right.
                if (t > 0) {
                    inside = !inside;
                }
            }
        }

        return inside;
    }

    /**
     * Computes the closest distance from the given point to the shape.
     */
    public distanceToPoint(p: Vector): number {
        let closestDistance: number | undefined = undefined;

        // Try every line segment, to see which is closest.
        for (const line of this.lines) {
            // Normal vector.
            const dl = line.p2.minus(line.p1); 
            const n = dl.perpendicular().normalized();
            if (n.lengthSquared() === 0) {
                continue;
            }

            // Dot with line endpoint. This finds the distance between
            // the point and the line (not line segment).
            const dot = n.dot(p.minus(line.p1));

            // Project back to line.
            let pp = p.minus(n.times(dot));

            // Find distance along line.
            let t: number;
            if (Math.abs(dl.x) > Math.abs(dl.y)) {
                t = (pp.x - line.p1.x)/dl.x;
            } else {
                t = (pp.y - line.p1.y)/dl.y;
            }

            // Clamp to line segment.
            t = Math.max(Math.min(t, 1), 0);

            // Put back on line.
            pp = line.lerp(t);

            // Find distance.
            const dist = p.minus(pp).length();

            if (closestDistance === undefined || dist < closestDistance) {
                closestDistance = dist;
            }
        }

        if (closestDistance === undefined) {
            throw new Error("can't find distance, no lines in shape");
        }

        return closestDistance;
    }
}

/**
 * A circle, specified by its center and radius.
 */
class Circle {
    public readonly c: Vector;
    public readonly r: number;

    constructor(c: Vector, r: number) {
        this.c = c;
        this.r = r;
    }
}

/**
 * Add a random circle to the list of circles. The new circle must have its center
 * in the draw area, be inside the shape, not be inside an existing circle, and
 * be as large as possible without touching the edge of the draw area, other circle,
 * or shape, or exceed the maximum radius.
 */
function addCircle(circles: Circle[], drawArea: Rect, shape: Shape): boolean {
    const MAX_RADIUS = 0.5*DPI;

    for (let attempt = 0; attempt < 5000; attempt++) {
        const p = drawArea.randomPoint();
        let minDist = MAX_RADIUS;

        // Clip to shape.
        if (shape.isInside(p)) {
            const dist = shape.distanceToPoint(p);
            if (dist > 0) {
                minDist = Math.min(minDist, dist);
            }
        } else {
            // Outside of shape.
            continue;
        }

        // Avoid being inside circle, and find distance to closest circle.
        let insideCircle = false;
        for (const c of circles) {
            const dist2 = p.minus(c.c).lengthSquared();
            if (dist2 <= c.r*c.r) {
                // Inside a circle, pick a new point.
                insideCircle = true;
                break;
            }
            const dist = Math.sqrt(dist2) - c.r;
            if (dist < minDist) {
                minDist = dist;
            }
        }

        if (!insideCircle) {
            circles.push(new Circle(p, minDist));
            return true;
        }
    }

    return false;
}

/**
 * Return a shape corresponding to the given text in the given font.
 */
async function makeTextShape(fontPathname: string, text: string): Promise<Shape> {
    const shape = new Shape();
    const rawFontBinary = await Deno.readFile(fontPathname);
    const font = opentype.parse(rawFontBinary.buffer, {});
    const path = font.getPath(text);

    // Current point.
    let p = Vector.ZERO;
    // First point of path.
    let firstPoint: Vector | undefined = undefined;
    for (const command of path.commands) {
        switch (command.type) {
            case "M":
                // Move point.
                p = new Vector(command.x, command.y);
                if (firstPoint === undefined) {
                    firstPoint = p;
                }
                break;

            case "L": {
                // Line to new point.
                const p2 = new Vector(command.x, command.y);
                shape.lines.push(new Line(p, p2));
                p = p2;
                break;
            }

            case "C": {
                // Bezier curve to new point.
                const p2 = new Vector(command.x1, command.y1);
                const p3 = new Vector(command.x2, command.y2);
                const p4 = new Vector(command.x, command.y);
                shape.addBezier(p, p2, p3, p4);
                p = p4;
                break;
            }

            case "Z":
                // Close path and start a new path.
                if (firstPoint === undefined) {
                    throw new Error("cannot close path, we have no first point");
                }
                shape.lines.push(new Line(p, firstPoint));
                firstPoint = undefined;
                break;

            default:
                throw new Error("unknown path command: " + command.type);
        }
    }

    return shape;
}

/**
 * Stack the given shapes vertically (top to bottom), centered, with the given gap between them.
 * The location is unspecified; move the shape if you need it elsewhere.
 */
function stackVertically(shapes: Shape[], gap: number): Shape {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Shape();
    let dy = 0;

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const bbox = bboxes[i];

        const p = bboxes[0].p.minus(bbox.p).plus(new Vector((bboxes[0].size.x - bbox.size.x)/2, dy));
        finalShape.lines.push(... shape.translateBy(p).lines);

        dy += bbox.size.y + gap;
    }

    return finalShape;
}

/**
 * Stack the given shapes horizontally (left to right), centered vertically, with the given gap between them.
 * The location is unspecified; move the shape if you need it elsewhere.
 */
function stackHorizontally(shapes: Shape[], gap: number): Shape {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Shape();
    let dx = 0;

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const bbox = bboxes[i];

        const p = bboxes[0].p.minus(bbox.p).plus(new Vector(dx, (bboxes[0].size.y - bbox.size.y)/2));
        finalShape.lines.push(... shape.translateBy(p).lines);

        dx += bbox.size.x + gap;
    }

    return finalShape;
}

async function main(): Promise<void> {
    const pageSize = new Vector(8.5*DPI, 11*DPI).swap();
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;
    const drawArea = page.insetBy(margin);

    const circles: Circle[] = [];

    const sfFontPathname = "/Library/Fonts/SF-Pro-Text-Regular.otf";
    const garamondFontPathname = "/Library/Fonts/AGaramondPro-Regular.otf";

    const shape1 = await makeTextShape(garamondFontPathname, "H");
    const shape2 = await makeTextShape(sfFontPathname, "♥");
    const shape3 = await makeTextShape(garamondFontPathname, "H");

    // const shape = stackVertically([shape1, shape2, shape3], 0.1*DPI);
    const shape = stackHorizontally([shape1, shape2, shape3], 0.0*DPI);
    const bigShape = shape.centerIn(drawArea);

    // const bigShape = shape2.centerIn(drawArea);
    // const bigShape2 = shape.centerIn(drawArea);
    // bigShape.lines.push(... shape.lines);

    while (circles.length < 2000 && true) {
        const succeeded = addCircle(circles, drawArea, bigShape);
        if (!succeeded) {
            console.log("Failed to add circle after " + circles.length + " circles");
            break;
        }
    }

    const svg = new Svg(pageSize);
    // svg.drawRect(Vector.ZERO, pageSize);
    // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));
    for (const circle of circles) {
        svg.drawCircle(circle.c, circle.r);
    }
    for (const line of bigShape.lines) {
        // svg.drawLine(line.p1, line.p2);
    }
    await svg.save("out.svg");
}

await main();
