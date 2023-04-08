
import opentype from  "https://unpkg.com/opentype.js@1.3.4/dist/opentype.module.js";
import { Vector } from "./Vector.ts";
import { DPI, Svg } from "./Svg.ts";
import { Rect } from "./Rect.ts";
import { Line } from "./Line.ts";
import { Circle } from "./Circle.ts";
import { Polygon } from "./Polygon.ts";

/**
 * Add a random circle to the list of circles. The new circle must have its center
 * in the draw area, be inside the shape, not be inside an existing circle, and
 * be as large as possible without touching the edge of the draw area, other circle,
 * or shape, or exceed the maximum radius.
 */
function addCircle(circles: Circle[], drawArea: Rect, polygon: Polygon): boolean {
    const MAX_RADIUS = 0.5*DPI;

    for (let attempt = 0; attempt < 5000; attempt++) {
        const p = drawArea.randomPoint();
        let minDist = MAX_RADIUS;

        // Clip to shape.
        if (polygon.isInside(p)) {
            const dist = polygon.distanceToPoint(p);
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
async function makeTextShape(fontPathname: string, text: string): Promise<Polygon> {
    const shape = new Polygon();
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
function stackVertically(shapes: Polygon[], gap: number): Polygon {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Polygon();
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
function stackHorizontally(shapes: Polygon[], gap: number): Polygon {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Polygon();
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
